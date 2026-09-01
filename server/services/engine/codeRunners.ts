import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import vm from 'vm';
import { v4 as uuidv4 } from 'uuid';

export interface CodeExecutionResult {
  output: any;
  updatedVariables: Record<string, any>;
  logs: string[];
}

/**
 * Execute Python code locally using system Python with zero external API key requirements.
 * Injects a `flow` helper object to access and modify workflow variables seamlessly.
 */
export async function runPythonScript(
  code: string,
  inputVariables: Record<string, any>,
  log?: (message: string, level?: 'info' | 'warn' | 'error' | 'success') => void
): Promise<CodeExecutionResult> {
  const executionTempId = uuidv4().substring(0, 8);
  const tempDir = os.tmpdir();
  const scriptPath = path.join(tempDir, `flowpilot_py_${executionTempId}.py`);
  const logs: string[] = [];

  const addLog = (msg: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    logs.push(`[${level.toUpperCase()}] ${msg}`);
    if (log) log(msg, level);
  };

  // Python wrapper script with bidirectional JSON variable bridging
  const pythonWrapper = `
# -*- coding: utf-8 -*-
import sys
import json
import os
import math
import re
import urllib.request
import urllib.parse

class FlowHelper:
    def __init__(self, vars_dict):
        self.variables = vars_dict
        self._updates = {}
        self._output = None

    def get(self, key, default=None):
        return self.variables.get(key, default)

    def set(self, key, value):
        self.variables[key] = value
        self._updates[key] = value
        return value

    def update(self, new_dict):
        if isinstance(new_dict, dict):
            for k, v in new_dict.items():
                self.set(k, v)

    def output(self, val):
        self._output = val

# Initialize variables
raw_input = """${JSON.stringify(inputVariables).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"""
try:
    flow = FlowHelper(json.loads(raw_input))
except Exception as e:
    flow = FlowHelper({})

# User Code Execution
def _user_script_main():
${code.split('\n').map(line => '    ' + line).join('\n')}

try:
    _res = _user_script_main()
    if flow._output is None and _res is not None:
        flow.output(_res)
except Exception as e:
    import traceback
    sys.stderr.write("Traceback:\\n" + traceback.format_exc())
    sys.exit(1)

# Emit final state marker
sys.stdout.flush()
sys.stderr.flush()
print("---FLOWPILOT_PY_OUTPUT_START---")
print(json.dumps({
    "output": flow._output,
    "updates": flow._updates
}, default=str))
print("---FLOWPILOT_PY_OUTPUT_END---")
`;

  try {
    fs.writeFileSync(scriptPath, pythonWrapper, 'utf8');

    // Try finding Python command (python, python3, py)
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    return await new Promise<CodeExecutionResult>((resolve, reject) => {
      const child = spawn(pythonCmd, [scriptPath], {
        env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
        windowsHide: true
      });

      let stdoutAccumulator = '';
      let stderrAccumulator = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString('utf8');
        stdoutAccumulator += chunk;

        // Extract any user print lines that aren't our sentinel
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.includes('---FLOWPILOT_PY_OUTPUT_')) {
            addLog(`[Python] ${trimmed}`, 'info');
          }
        }
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString('utf8');
        stderrAccumulator += chunk;
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            addLog(`[Python Error] ${trimmed}`, 'warn');
          }
        }
      });

      child.on('error', (err) => {
        try { fs.unlinkSync(scriptPath); } catch {}
        addLog(`Failed to spawn Python process: ${err.message}. Please ensure Python is installed and in PATH.`, 'error');
        reject(new Error(`Python execution failed: ${err.message}`));
      });

      child.on('close', (code) => {
        try { fs.unlinkSync(scriptPath); } catch {}

        if (code !== 0) {
          const errMsg = stderrAccumulator.trim() || `Process exited with code ${code}`;
          addLog(`Python script failed: ${errMsg}`, 'error');
          return reject(new Error(`Python script execution error:\n${errMsg}`));
        }

        // Parse result payload from sentinel markers
        let parsedOutput: any = null;
        let updatedVariables: Record<string, any> = {};

        const startMarker = '---FLOWPILOT_PY_OUTPUT_START---';
        const endMarker = '---FLOWPILOT_PY_OUTPUT_END---';

        const startIndex = stdoutAccumulator.indexOf(startMarker);
        const endIndex = stdoutAccumulator.indexOf(endMarker);

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          const jsonText = stdoutAccumulator.substring(startIndex + startMarker.length, endIndex).trim();
          try {
            const payload = JSON.parse(jsonText);
            parsedOutput = payload.output;
            updatedVariables = payload.updates || {};
          } catch (e: any) {
            addLog(`Warning: Failed to parse Python result payload: ${e.message}`, 'warn');
          }
        }

        addLog(`✓ Python script executed successfully`, 'success');
        resolve({
          output: parsedOutput,
          updatedVariables,
          logs
        });
      });
    });
  } catch (err: any) {
    try { fs.unlinkSync(scriptPath); } catch {}
    throw err;
  }
}

/**
 * Execute Node.js / JavaScript code in a powerful sandbox with built-in fetch, crypto, array helpers,
 * and bidirectional flow variable access.
 */
export async function runJavaScriptScript(
  code: string,
  inputVariables: Record<string, any>,
  log?: (message: string, level?: 'info' | 'warn' | 'error' | 'success') => void
): Promise<CodeExecutionResult> {
  const logs: string[] = [];
  const addLog = (msg: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    logs.push(`[${level.toUpperCase()}] ${msg}`);
    if (log) log(msg, level);
  };

  const updatedVariables: Record<string, any> = {};
  const currentVariables = { ...inputVariables };

  const flowHelper = {
    variables: currentVariables,
    get: (key: string, defaultValue?: any) => (currentVariables[key] !== undefined ? currentVariables[key] : defaultValue),
    set: (key: string, value: any) => {
      currentVariables[key] = value;
      updatedVariables[key] = value;
      return value;
    },
    update: (obj: Record<string, any>) => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach((k) => {
          currentVariables[k] = obj[k];
          updatedVariables[k] = obj[k];
        });
      }
    },
    output: (val: any) => {
      return val;
    }
  };

  const customConsole = {
    log: (...args: any[]) => addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info'),
    info: (...args: any[]) => addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info'),
    warn: (...args: any[]) => addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'warn'),
    error: (...args: any[]) => addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'error')
  };

  try {
    // Create async function wrapper
    const asyncFunctionConstructor = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new asyncFunctionConstructor(
      'flow',
      'variables',
      'console',
      'fetch',
      'Buffer',
      'crypto',
      'JSON',
      'Math',
      'RegExp',
      'Date',
      `
      "use strict";
      ${code}
      `
    );

    addLog('Executing Node.js JavaScript block...', 'info');
    const result = await runner(
      flowHelper,
      currentVariables,
      customConsole,
      globalThis.fetch,
      Buffer,
      crypto,
      JSON,
      Math,
      RegExp,
      Date
    );

    addLog(`✓ JavaScript execution complete`, 'success');
    return {
      output: result !== undefined ? result : null,
      updatedVariables,
      logs
    };
  } catch (err: any) {
    addLog(`JavaScript error: ${err.message}`, 'error');
    throw new Error(`JavaScript Execution Error: ${err.message}`);
  }
}

/**
 * Execute system shell command (Bash / CMD / PowerShell) locally.
 */
export async function runCliCommand(
  command: string,
  cwd?: string,
  log?: (message: string, level?: 'info' | 'warn' | 'error' | 'success') => void
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    if (log) log(`Executing CLI command: ${command}`, 'info');

    exec(command, { cwd: cwd || process.cwd(), maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const exitCode = error ? error.code || 1 : 0;
      if (stdout && log) {
        log(`[CLI Output]\n${stdout.trim()}`, 'info');
      }
      if (stderr && log) {
        log(`[CLI Warning/Stderr]\n${stderr.trim()}`, 'warn');
      }
      if (error && log) {
        log(`CLI exited with error code ${exitCode}`, 'error');
      } else if (log) {
        log(`✓ CLI command finished with exit code 0`, 'success');
      }

      resolve({
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode
      });
    });
  });
}
