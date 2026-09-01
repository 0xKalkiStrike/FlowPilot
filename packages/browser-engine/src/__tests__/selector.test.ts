import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { resolveLocator } from "../selector.js";
import { SelectorResolutionError } from "../types.js";
import { resolveChromiumExecutablePath } from "../chromiumPath.js";

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true, executablePath: resolveChromiumExecutablePath() });
  page = await browser.newPage();
  await page.setContent(`
    <form>
      <label for="email">Email address</label>
      <input id="email" name="email" type="email" data-testid="email-input" />
      <button data-testid="submit-btn">Submit</button>
      <div class="dup">A</div>
      <div class="dup">B</div>
    </form>
  `);
}, 60000);

afterAll(async () => {
  await browser?.close();
});

describe("resolveLocator", () => {
  it("resolves via testId first", async () => {
    const loc = await resolveLocator(page, { testId: "email-input", css: "input" });
    expect(await loc.getAttribute("name")).toBe("email");
  });

  it("resolves via label when no testId given", async () => {
    const loc = await resolveLocator(page, { label: "Email address" });
    expect(await loc.getAttribute("id")).toBe("email");
  });

  it("resolves via role+name for the submit button", async () => {
    const loc = await resolveLocator(page, { role: "button", name: "Submit" });
    expect(await loc.textContent()).toBe("Submit");
  });

  it("falls back to css when higher-priority strategies are absent", async () => {
    const loc = await resolveLocator(page, { css: "#email" });
    expect(await loc.getAttribute("name")).toBe("email");
  });

  it("throws SelectorResolutionError when nothing matches", async () => {
    await expect(resolveLocator(page, { css: "#does-not-exist" })).rejects.toBeInstanceOf(SelectorResolutionError);
  });
});
