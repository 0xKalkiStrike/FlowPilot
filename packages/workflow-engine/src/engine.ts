import type { Browser, BrowserContext, Page } from "playwright";
import {
  type WorkflowDocument,
  type WorkflowNode,
  type WorkflowEdge,
  ExecutionStatus,
  type ExecutionStatusType,
  type ExecutionEvent,
  getNodeDefinition,
} from "@flowpilot/workflow-schema";
import {
  executeNode,
  launchEphemeralContext,
  launchPersistentProfile,
  HumanVerificationRequiredError,
  type NodeExecutionContext,
} from "@flowpilot/browser-engine";
import { resolveDeep, generateId } from "@flowpilot/shared";
import { buildChain, StopSignal } from "./graph.js";
import { evaluateCondition } from "./conditions.js";

export interface RunOptions {
  workflow: WorkflowDocument;
  executionId: string;
  storageDir: string;
  screenshotsDir: string;
  downloadsDir: string;
  uploadsDir: string;
  browserProfilesDir: string;
  initialVariables?: Record<string, unknown>;
  resolveCredential: (credentialId: string) => Promise<Record<string, string> | undefined>;
  onEvent: (event: ExecutionEvent) => void;
  isCancelled: () => boolean;
  /** For the builder's "Test Step": stop successfully right after this node id runs. */
  stopAfterNodeId?: string;
}

export interface RunResult {
  status: ExecutionStatusType;
  variables: Record<string, unknown>;
  error?: string;
}

interface EngineContext {
  page: Page;
  context: BrowserContext;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, unknown>;
  opts: RunOptions;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (!ms || ms <= 0) return promise;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms: ${label}`)), ms)),
  ]);
}

export class WorkflowEngine {
  async run(opts: RunOptions): Promise<RunResult> {
    const { workflow } = opts;
    const emit = (event: Omit<ExecutionEvent, "executionId">) => opts.onEvent({ ...event, executionId: opts.executionId } as ExecutionEvent);
    const log = (level: "debug" | "info" | "warn" | "error", message: string, nodeId?: string, nodeLabel?: string, data?: Record<string, unknown>) => {
      emit({
        type: "log",
        payload: { id: generateId("log"), executionId: opts.executionId, nodeId, nodeLabel, level, message, timestamp: new Date().toISOString(), data },
      });
    };

    emit({ type: "status", payload: { status: ExecutionStatus.RUNNING } });
    log("info", `Starting workflow "${workflow.name}"`);

    let browser: Browser | undefined;
    let context: BrowserContext | undefined;
    const variables: Record<string, unknown> = { ...opts.initialVariables };
    for (const v of workflow.variables) {
      if (variables[v.name] === undefined && v.defaultValue !== undefined) variables[v.name] = v.defaultValue;
    }

    try {
      const bc = workflow.browserConfig;
      if (bc.browserProfileId) {
        context = await launchPersistentProfile(opts.browserProfilesDir, bc.browserProfileId, {
          headless: bc.headless, viewport: bc.viewport, userAgent: bc.userAgent, locale: bc.locale,
          timezone: bc.timezone, slowMoMs: bc.slowMoMs, defaultTimeoutMs: bc.defaultTimeoutMs,
        });
      } else {
        const launched = await launchEphemeralContext({
          headless: bc.headless, viewport: bc.viewport, userAgent: bc.userAgent, locale: bc.locale,
          timezone: bc.timezone, slowMoMs: bc.slowMoMs, defaultTimeoutMs: bc.defaultTimeoutMs,
        });
        browser = launched.browser;
        context = launched.context;
      }
      const page = context.pages()[0] ?? (await context.newPage());

      const engineCtx: EngineContext = { page, context, nodes: workflow.nodes, edges: workflow.edges, variables, opts };

      const chain = buildChain(workflow.nodes, workflow.edges, null, null);
      if (chain.length === 0) throw new Error("Workflow has no starting node.");

      await this.executeChain(chain, engineCtx, log, emit);

      log("info", "Workflow completed successfully.");
      emit({ type: "status", payload: { status: ExecutionStatus.SUCCESS } });
      return { status: ExecutionStatus.SUCCESS, variables };
    } catch (err) {
      if (err instanceof StopSignal) {
        const status = err.status === "success" ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED;
        log(status === ExecutionStatus.SUCCESS ? "info" : "error", err.message);
        emit({ type: "status", payload: { status } });
        return { status, variables, error: status === ExecutionStatus.FAILED ? err.message : undefined };
      }
      if (err instanceof HumanVerificationRequiredError) {
        log("warn", "Human verification required. Execution paused for manual intervention.");
        emit({ type: "status", payload: { status: ExecutionStatus.PAUSED } });
        return { status: ExecutionStatus.PAUSED, variables, error: err.message };
      }
      const message = err instanceof Error ? err.message : String(err);
      log("error", `Workflow failed: ${message}`);
      emit({ type: "status", payload: { status: ExecutionStatus.FAILED, error: message } });
      return { status: ExecutionStatus.FAILED, variables, error: message };
    } finally {
      try { await context?.close(); } catch { /* already closed */ }
      try { await browser?.close(); } catch { /* already closed */ }
    }
  }

  private async executeChain(
    chain: WorkflowNode[],
    ctx: EngineContext,
    log: (level: "debug" | "info" | "warn" | "error", msg: string, nodeId?: string, nodeLabel?: string, data?: Record<string, unknown>) => void,
    emit: (event: Omit<ExecutionEvent, "executionId">) => void
  ): Promise<void> {
    for (const node of chain) {
      if (ctx.opts.isCancelled()) throw new StopSignal("failed", "Execution cancelled by user.");
      await this.executeControlOrLeaf(node, ctx, log, emit);
      if (ctx.opts.stopAfterNodeId && node.id === ctx.opts.stopAfterNodeId) {
        throw new StopSignal("success", `Test step "${node.label ?? node.type}" completed.`);
      }
    }
  }

  private async executeControlOrLeaf(
    node: WorkflowNode,
    ctx: EngineContext,
    log: (level: "debug" | "info" | "warn" | "error", msg: string, nodeId?: string, nodeLabel?: string, data?: Record<string, unknown>) => void,
    emit: (event: Omit<ExecutionEvent, "executionId">) => void
  ): Promise<void> {
    const label = node.label ?? getNodeDefinition(node.type)?.label ?? node.type;

    switch (node.type) {
      case "logic.if": {
        emit({ type: "node_status", payload: { nodeId: node.id, status: "started", label } });
        const cfg = resolveDeep(node.config, ctx.variables) as any;
        const result = await evaluateCondition(cfg, node.target, ctx.page, ctx.variables);
        const branch = result ? "true" : "false";
        log("info", `IF "${label}" evaluated to ${result}`, node.id, label, { branch });
        emit({ type: "node_status", payload: { nodeId: node.id, status: "success", label, data: { branch } } });
        const sub = buildChain(ctx.nodes, ctx.edges, node.id, branch);
        await this.executeChain(sub, ctx, log, emit);
        return;
      }
      case "logic.switch": {
        emit({ type: "node_status", payload: { nodeId: node.id, status: "started", label } });
        const cfg = resolveDeep(node.config, ctx.variables) as any;
        const value = ctx.variables[cfg.variableName];
        const cases: Array<{ value: string; label: string }> = cfg.cases ?? [];
        const match = cases.find((c) => c.value === String(value));
        const branch = match ? match.value : "default";
        emit({ type: "node_status", payload: { nodeId: node.id, status: "success", label, data: { branch } } });
        const sub = buildChain(ctx.nodes, ctx.edges, node.id, branch);
        await this.executeChain(sub, ctx, log, emit);
        return;
      }
      case "logic.loopRepeat": {
        const cfg = resolveDeep(node.config, ctx.variables) as any;
        const times = Math.max(0, Number(cfg.times) || 0);
        log("info", `Repeat "${label}" will run ${times} times`, node.id, label);
        for (let i = 0; i < times; i++) {
          if (ctx.opts.isCancelled()) throw new StopSignal("failed", "Execution cancelled by user.");
          ctx.variables["loopIndex"] = i;
          const sub = buildChain(ctx.nodes, ctx.edges, node.id, "loop");
          await this.executeChain(sub, ctx, log, emit);
        }
        return;
      }
      case "logic.loopForEach": {
        const cfg = resolveDeep(node.config, ctx.variables) as any;
        const list = ctx.variables[cfg.listVariableName];
        const arr = Array.isArray(list) ? list : [];
        log("info", `For Each "${label}" will iterate ${arr.length} items`, node.id, label);
        for (const item of arr) {
          if (ctx.opts.isCancelled()) throw new StopSignal("failed", "Execution cancelled by user.");
          ctx.variables[cfg.itemVariableName || "item"] = item;
          const sub = buildChain(ctx.nodes, ctx.edges, node.id, "loop");
          await this.executeChain(sub, ctx, log, emit);
        }
        return;
      }
      case "logic.loopWhile": {
        const raw = node.config as any;
        const maxIterations = Number(raw.maxIterations) || 50;
        let i = 0;
        while (i < maxIterations) {
          if (ctx.opts.isCancelled()) throw new StopSignal("failed", "Execution cancelled by user.");
          const cfg = resolveDeep(raw, ctx.variables) as any;
          const cond = await evaluateCondition(cfg, node.target, ctx.page, ctx.variables);
          if (!cond) break;
          const sub = buildChain(ctx.nodes, ctx.edges, node.id, "loop");
          await this.executeChain(sub, ctx, log, emit);
          i++;
        }
        return;
      }
      case "logic.loopUntil": {
        const raw = node.config as any;
        const maxIterations = Number(raw.maxIterations) || 50;
        let i = 0;
        while (i < maxIterations) {
          if (ctx.opts.isCancelled()) throw new StopSignal("failed", "Execution cancelled by user.");
          const sub = buildChain(ctx.nodes, ctx.edges, node.id, "loop");
          await this.executeChain(sub, ctx, log, emit);
          i++;
          const cfg = resolveDeep(raw, ctx.variables) as any;
          const cond = await evaluateCondition(cfg, node.target, ctx.page, ctx.variables);
          if (cond) break;
        }
        return;
      }
      case "logic.stop": {
        const cfg = resolveDeep(node.config, ctx.variables) as any;
        throw new StopSignal(cfg.status === "failed" ? "failed" : "success", cfg.message || `Stopped at "${label}"`);
      }
      default:
        await this.executeLeafNode(node, ctx, log, emit);
    }
  }

  private async executeLeafNode(
    node: WorkflowNode,
    ctx: EngineContext,
    log: (level: "debug" | "info" | "warn" | "error", msg: string, nodeId?: string, nodeLabel?: string, data?: Record<string, unknown>) => void,
    emit: (event: Omit<ExecutionEvent, "executionId">) => void
  ): Promise<void> {
    const label = node.label ?? getNodeDefinition(node.type)?.label ?? node.type;
    const retry = node.retry ?? { maxAttempts: 1, delayMs: 1000 };
    const errorHandling = node.errorHandling ?? { onError: "stop" as const, screenshotOnError: true, capturePageHtml: false };
    const timeoutMs = node.timeout ?? ctx.opts.workflow.browserConfig.defaultTimeoutMs ?? 30000;

    emit({ type: "node_status", payload: { nodeId: node.id, status: "started", label } });
    log("info", `Running "${label}"`, node.id, label);

    let lastErr: unknown;
    for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
      try {
        const credential = node.credentialId ? await ctx.opts.resolveCredential(node.credentialId) : undefined;
        const nodeExecCtx: NodeExecutionContext = {
          page: ctx.page,
          context: ctx.context,
          config: resolveDeep(node.config, ctx.variables) as Record<string, unknown>,
          target: node.target,
          variables: ctx.variables,
          setVariable: (name, value) => { ctx.variables[name] = value; },
          credential,
          timeoutMs,
          storageDir: ctx.opts.storageDir,
          screenshotsDir: ctx.opts.screenshotsDir,
          downloadsDir: ctx.opts.downloadsDir,
          uploadsDir: ctx.opts.uploadsDir,
          executionId: ctx.opts.executionId,
          log: (level, message, data) => log(level, message, node.id, label, data),
        };
        const result = await withTimeout(executeNode(node.type, nodeExecCtx), timeoutMs, label);
        emit({ type: "node_status", payload: { nodeId: node.id, status: "success", label, data: result.output } });
        log("info", `"${label}" completed`, node.id, label, result.output);
        return;
      } catch (err) {
        lastErr = err;
        if (err instanceof HumanVerificationRequiredError) throw err;
        if (attempt < retry.maxAttempts) {
          log("warn", `"${label}" failed (attempt ${attempt}/${retry.maxAttempts}): ${(err as Error).message}. Retrying...`, node.id, label);
          await sleep(retry.delayMs);
          continue;
        }
      }
    }

    const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
    let screenshotPath: string | undefined;
    if (errorHandling.screenshotOnError) {
      try {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        await fs.mkdir(ctx.opts.screenshotsDir, { recursive: true });
        screenshotPath = path.join(ctx.opts.screenshotsDir, `${ctx.opts.executionId}-error-${node.id}-${Date.now()}.png`);
        await ctx.page.screenshot({ path: screenshotPath, fullPage: true });
      } catch { /* best effort */ }
    }

    emit({ type: "node_status", payload: { nodeId: node.id, status: "failed", label, error: message, screenshotPath } });
    log("error", `"${label}" failed: ${message}`, node.id, label);

    if (errorHandling.onError === "continue") {
      log("warn", `Continuing workflow despite error in "${label}" (continue-on-error is enabled).`, node.id, label);
      return;
    }
    throw lastErr instanceof Error ? lastErr : new Error(message);
  }
}
