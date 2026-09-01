import fs from "node:fs";

/**
 * Resolves a Chromium executable to launch with. Most installs should leave
 * this alone — Playwright resolves its own downloaded browser automatically.
 * Two escape hatches exist for environments where the browser is
 * pre-installed at a fixed path outside Playwright's normal cache (for
 * example a locked-down sandbox with no access to Playwright's download
 * CDN): set PLAYWRIGHT_CHROMIUM_PATH explicitly, or rely on the well-known
 * `/opt/pw-browsers/chromium` path this repo was developed against.
 */
export function resolveChromiumExecutablePath(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const wellKnownPath = "/opt/pw-browsers/chromium";
  if (fs.existsSync(wellKnownPath)) return wellKnownPath;
  return undefined;
}
