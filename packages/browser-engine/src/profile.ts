import path from "node:path";
import fs from "node:fs/promises";
import { chromium, type BrowserContext } from "playwright";
import type { BrowserRuntimeConfig } from "./types.js";
import { resolveChromiumExecutablePath } from "./chromiumPath.js";

/**
 * Browser profiles are persistent, isolated Playwright user-data directories
 * (one per workspace/profile id). Reusing a profile's directory across runs
 * preserves cookies/localStorage, i.e. an authenticated session, without the
 * application ever needing to see or export raw session data.
 */
export function profileDir(baseDir: string, profileId: string): string {
  return path.join(baseDir, profileId);
}

export async function ensureProfileDir(baseDir: string, profileId: string): Promise<string> {
  const dir = profileDir(baseDir, profileId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function deleteProfile(baseDir: string, profileId: string): Promise<void> {
  const dir = profileDir(baseDir, profileId);
  await fs.rm(dir, { recursive: true, force: true });
}

export async function launchPersistentProfile(
  baseDir: string,
  profileId: string,
  runtime: Partial<BrowserRuntimeConfig> = {}
): Promise<BrowserContext> {
  const dir = await ensureProfileDir(baseDir, profileId);
  const context = await chromium.launchPersistentContext(dir, {
    headless: runtime.headless ?? false,
    executablePath: resolveChromiumExecutablePath(),
    viewport: runtime.viewport ?? { width: 1366, height: 900 },
    userAgent: runtime.userAgent,
    locale: runtime.locale,
    timezoneId: runtime.timezone,
    slowMo: runtime.slowMoMs ?? 0,
    acceptDownloads: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  context.setDefaultTimeout(runtime.defaultTimeoutMs ?? 30000);
  return context;
}

export async function launchEphemeralContext(runtime: Partial<BrowserRuntimeConfig> = {}): Promise<{
  browser: import("playwright").Browser;
  context: BrowserContext;
}> {
  const browser = await chromium.launch({
    headless: runtime.headless ?? false,
    executablePath: resolveChromiumExecutablePath(),
    slowMo: runtime.slowMoMs ?? 0,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: runtime.viewport ?? { width: 1366, height: 900 },
    userAgent: runtime.userAgent,
    locale: runtime.locale,
    timezoneId: runtime.timezone,
    acceptDownloads: true,
  });
  context.setDefaultTimeout(runtime.defaultTimeoutMs ?? 30000);
  return { browser, context };
}
