import type { Page } from "playwright";

const CAPTCHA_MARKERS = [
  "recaptcha", "hcaptcha", "cf-turnstile", "captcha-delivery",
  "verify you are human", "are you a robot", "press and hold",
];

/**
 * Best-effort detection of a CAPTCHA / human-verification challenge on the
 * current page. FlowPilot never attempts to solve or bypass these (spec
 * section 40/70) — it pauses and reports so the user can intervene manually.
 */
export async function detectHumanVerification(page: Page): Promise<boolean> {
  try {
    const html = await page.content();
    const lower = html.toLowerCase();
    return CAPTCHA_MARKERS.some((marker) => lower.includes(marker));
  } catch {
    return false;
  }
}
