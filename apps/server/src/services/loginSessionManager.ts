import type { BrowserContext } from "playwright";
import { launchPersistentProfile } from "@flowpilot/browser-engine";
import { env } from "../env.js";

/**
 * Manages ad-hoc headed browser sessions opened so a user can log into a
 * website manually against a persistent Browser Profile (spec section 17:
 * "Login Again"). The resulting cookies/local storage are saved to the
 * profile's user-data directory and reused by future workflow runs.
 */
class LoginSessionManager {
  private contexts = new Map<string, BrowserContext>();

  async open(profileId: string, startUrl?: string) {
    if (this.contexts.has(profileId)) {
      throw new Error("A login session is already open for this browser profile.");
    }
    const context = await launchPersistentProfile(env.browserProfilesDir, profileId, { headless: false });
    const page = context.pages()[0] ?? (await context.newPage());
    if (startUrl) await page.goto(startUrl).catch(() => {});
    context.once("close", () => this.contexts.delete(profileId));
    this.contexts.set(profileId, context);
  }

  isOpen(profileId: string): boolean {
    return this.contexts.has(profileId);
  }

  async close(profileId: string) {
    const context = this.contexts.get(profileId);
    if (!context) return;
    await context.close();
    this.contexts.delete(profileId);
  }
}

export const loginSessionManager = new LoginSessionManager();
