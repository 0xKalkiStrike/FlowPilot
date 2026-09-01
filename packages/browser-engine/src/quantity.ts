import type { Locator, Page } from "playwright";
import { resolveLocator } from "./selector.js";
import type { ElementTarget } from "@flowpilot/workflow-schema";

export interface QuantityConfig {
  desiredQuantity: number;
  strategy: "auto" | "input" | "increment" | "dropdown";
  incrementSelectorCss?: string;
  decrementSelectorCss?: string;
  min?: number;
  max?: number;
}

/**
 * Sets a product quantity (spec section 18). Detects whether the target
 * element is a direct numeric input, a <select> dropdown, or requires
 * stepper +/- buttons, then drives it to the desired value.
 */
export async function setQuantity(page: Page, target: ElementTarget, cfg: QuantityConfig): Promise<{ finalValue: number }> {
  const locator = await resolveLocator(page, target);
  const tag = await locator.evaluate((el) => el.tagName.toLowerCase()).catch(() => "input");
  const desired = clamp(cfg.desiredQuantity, cfg.min, cfg.max);

  const strategy = cfg.strategy === "auto" ? await detectStrategy(locator, tag, cfg) : cfg.strategy;

  if (strategy === "dropdown" || tag === "select") {
    await locator.selectOption({ value: String(desired) }).catch(() => locator.selectOption({ label: String(desired) }));
    return { finalValue: desired };
  }

  if (strategy === "increment" && (cfg.incrementSelectorCss || cfg.decrementSelectorCss)) {
    let current = await readCurrentValue(locator);
    const incLoc = cfg.incrementSelectorCss ? page.locator(cfg.incrementSelectorCss) : undefined;
    const decLoc = cfg.decrementSelectorCss ? page.locator(cfg.decrementSelectorCss) : undefined;
    let guard = 0;
    while (current !== desired && guard < 200) {
      if (current < desired && incLoc) {
        await incLoc.click();
        current += 1;
      } else if (current > desired && decLoc) {
        await decLoc.click();
        current -= 1;
      } else {
        break;
      }
      guard += 1;
    }
    return { finalValue: current };
  }

  // Direct input strategy: select all + type new value.
  await locator.fill(String(desired)).catch(async () => {
    await locator.click({ clickCount: 3 });
    await locator.type(String(desired));
  });
  await locator.evaluate((el) => el.dispatchEvent(new Event("change", { bubbles: true }))).catch(() => {});
  return { finalValue: desired };
}

async function detectStrategy(locator: Locator, tag: string, cfg: QuantityConfig): Promise<"input" | "increment" | "dropdown"> {
  if (tag === "select") return "dropdown";
  const isEditable = await locator.isEditable().catch(() => false);
  if (isEditable) return "input";
  if (cfg.incrementSelectorCss || cfg.decrementSelectorCss) return "increment";
  return "input";
}

async function readCurrentValue(locator: Locator): Promise<number> {
  const value = await locator.inputValue().catch(async () => (await locator.textContent().catch(() => "0")) ?? "0");
  const parsed = parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min?: number, max?: number): number {
  let v = value;
  if (typeof min === "number") v = Math.max(min, v);
  if (typeof max === "number") v = Math.min(max, v);
  return v;
}
