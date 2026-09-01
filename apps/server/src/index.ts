import fs from "node:fs/promises";
import { buildApp } from "./app.js";
import { env } from "./env.js";
import { scheduler } from "./scheduler/index.js";

async function ensureDirs() {
  await Promise.all([
    fs.mkdir(env.storageDir, { recursive: true }),
    fs.mkdir(env.screenshotsDir, { recursive: true }),
    fs.mkdir(env.downloadsDir, { recursive: true }),
    fs.mkdir(env.uploadsDir, { recursive: true }),
    fs.mkdir(env.browserProfilesDir, { recursive: true }),
  ]);
}

async function main() {
  if (!env.credentialEncryptionKey) {
    console.warn(
      "[flowpilot] WARNING: CREDENTIAL_ENCRYPTION_KEY is not set. Credential save/use will fail until you set it in .env.\n" +
      "  Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  await ensureDirs();

  const app = await buildApp();
  await scheduler.loadAll();

  await app.listen({ port: env.port, host: env.host });
  console.log(`[flowpilot] server listening on http://${env.host}:${env.port}`);
}

main().catch((err) => {
  console.error("[flowpilot] fatal startup error", err);
  process.exit(1);
});
