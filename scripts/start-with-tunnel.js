import { spawn } from 'child_process';
import http from 'http';
import localtunnel from 'localtunnel';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

function printBanner(localUrl, publicUrl) {
  const border = '═'.repeat(70);
  console.log('\n' + border);
  console.log('            🚀  FLOWPILOT VISUAL AUTOMATION PLATFORM  🚀');
  console.log('               "Build browser automations visually."');
  console.log(border);
  console.log(`\n  📌 [1] LOCALHOST URL (Your Machine):`);
  console.log(`      👉 \x1b[36m\x1b[1m${localUrl}\x1b[0m`);
  console.log(`\n  🌐 [2] PORT FORWARDED PUBLIC URL (Access from Anywhere):`);
  console.log(`      👉 \x1b[32m\x1b[1m${publicUrl}\x1b[0m`);
  console.log(`\n  🔌 [3] WEBSOCKET LIVE STREAMING:`);
  console.log(`      👉 \x1b[35mws://localhost:${PORT}/ws\x1b[0m`);
  console.log('\n' + border);
  console.log('  ⚡ Status: ACTIVE (Playwright Browser + SQLite DB + Real-Time WS)');
  console.log('  💡 Press Ctrl+C anytime to stop.');
  console.log(border + '\n');
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function startTunnel(targetPort) {
  // 1. Try localtunnel
  try {
    const tunnel = await localtunnel({
      port: targetPort,
      allow_invalid_cert: true
    });

    tunnel.on('error', (err) => {
      console.warn('Tunnel notice:', err.message);
    });

    if (tunnel.url) {
      return tunnel.url;
    }
  } catch (err) {
    console.log('Attempting alternative tunnel connector...');
  }

  // 2. Fallback: Pinggy / OpenSSH Tunnel
  return await startPinggyFallback(targetPort);
}

function startPinggyFallback(targetPort) {
  return new Promise((resolve) => {
    try {
      const ssh = spawn('ssh', [
        '-p', '443',
        '-R0:localhost:' + targetPort,
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=30',
        'a.pinggy.io'
      ]);

      let resolved = false;
      ssh.stdout.on('data', (data) => {
        const str = data.toString();
        const match = str.match(/https:\/\/[a-z0-9-]+\.a\.pinggy\.link/);
        if (match && !resolved) {
          resolved = true;
          resolve(match[0]);
        }
      });

      ssh.stderr.on('data', () => {});

      setTimeout(() => {
        if (!resolved) {
          resolve(`http://localhost:${targetPort} (Tunnel in progress)`);
        }
      }, 5000);
    } catch {
      resolve(`http://localhost:${targetPort}`);
    }
  });
}

async function main() {
  console.log('Initializing FlowPilot backend server...');

  // Start the server process
  const serverProcess = spawn('node', ['dist/server/index.js'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) }
  });

  const localUrl = `http://localhost:${PORT}`;

  // Wait until server is ready
  await waitForServer(`${localUrl}/api/health`);

  // Start port forwarding tunnel
  const publicUrl = await startTunnel(PORT);

  // Display the dual URLs banner
  printBanner(localUrl, publicUrl);

  const cleanup = () => {
    try {
      serverProcess.kill();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('Launcher error:', err);
});
