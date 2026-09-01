import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { setQuantity } from "../quantity.js";
import { resolveChromiumExecutablePath } from "../chromiumPath.js";

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true, executablePath: resolveChromiumExecutablePath() });
  page = await browser.newPage();
}, 60000);

afterAll(async () => {
  await browser?.close();
});

describe("setQuantity", () => {
  it("sets a direct numeric input", async () => {
    await page.setContent(`<input id="qty" type="number" value="1" data-testid="qty" />`);
    const result = await setQuantity(page, { testId: "qty" }, { desiredQuantity: 5, strategy: "auto", min: 1, max: 10 });
    expect(result.finalValue).toBe(5);
    expect(await page.locator("#qty").inputValue()).toBe("5");
  });

  it("selects a dropdown option", async () => {
    await page.setContent(`
      <select id="qty" data-testid="qty">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
    `);
    const result = await setQuantity(page, { testId: "qty" }, { desiredQuantity: 3, strategy: "auto", min: 1, max: 3 });
    expect(result.finalValue).toBe(3);
    expect(await page.locator("#qty").inputValue()).toBe("3");
  });

  it("clamps to the configured maximum", async () => {
    await page.setContent(`<input id="qty" type="number" value="1" data-testid="qty" />`);
    const result = await setQuantity(page, { testId: "qty" }, { desiredQuantity: 999, strategy: "input", min: 1, max: 10 });
    expect(result.finalValue).toBe(10);
  });
});
