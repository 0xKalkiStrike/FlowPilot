import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../.."); // apps/server/src -> repo root

dotenv.config({ path: path.join(rootDir, ".env") });

function resolveFromRoot(p: string | undefined, fallback: string): string {
  const value = p && p.length > 0 ? p : fallback;
  return path.isAbsolute(value) ? value : path.resolve(path.join(rootDir, "apps/server"), value);
}

export const env = {
  rootDir,
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me",
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "flowpilot_session",
  credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY ?? "",
  browserHeadless: (process.env.BROWSER_HEADLESS ?? "false") === "true",
  browserDefaultTimeoutMs: Number(process.env.BROWSER_DEFAULT_TIMEOUT_MS ?? 30000),
  storageDir: resolveFromRoot(process.env.STORAGE_DIR, "../../storage"),
  screenshotsDir: resolveFromRoot(process.env.SCREENSHOTS_DIR, "../../screenshots"),
  downloadsDir: resolveFromRoot(process.env.DOWNLOADS_DIR, "../../storage/downloads"),
  uploadsDir: resolveFromRoot(process.env.UPLOADS_DIR, "../../storage/uploads"),
  browserProfilesDir: resolveFromRoot(process.env.BROWSER_PROFILES_DIR, "../../storage/browser-profiles"),
  webOrigin: process.env.VITE_API_URL ? undefined : undefined,
};
