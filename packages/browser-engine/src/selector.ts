import type { Page, Locator } from "playwright";
import type { ElementTarget } from "@flowpilot/workflow-schema";
import { SelectorResolutionError } from "./types.js";

function cssEscapeValue(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function buildAttributeLocator(page: Page, attributes: Record<string, string>, tagName?: string): Locator {
  const tag = tagName ? tagName.toLowerCase() : "";
  const attrSelector = Object.entries(attributes)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `[${k}="${cssEscapeValue(v)}"]`)
    .join("");
  if (!attrSelector) throw new Error("No usable attributes");
  return page.locator(`${tag}${attrSelector}`);
}

/**
 * Resolves an ElementTarget to a Playwright Locator by trying each selector
 * strategy in priority order (testId > role/name > label > attributes >
 * text > css > xpath). The first strategy that resolves to at least one
 * element wins; ambiguous matches (count > 1) fall back to `.first()` with a
 * warning rather than guessing further down the priority list, since a
 * higher-confidence strategy narrowing to "some" elements beats a
 * lower-confidence strategy narrowing to "one".
 */
export async function resolveLocator(
  page: Page,
  target: ElementTarget,
  onWarn?: (msg: string) => void
): Promise<Locator> {
  type Candidate = { strategy: string; build: () => Locator };
  const candidates: Candidate[] = [];

  if (target.testId) {
    candidates.push({ strategy: "testId", build: () => page.getByTestId(target.testId!) });
  }
  if (target.role) {
    candidates.push({
      strategy: "role",
      build: () =>
        target.name
          ? page.getByRole(target.role as any, { name: target.name, exact: false })
          : page.getByRole(target.role as any),
    });
  }
  if (target.label) {
    candidates.push({ strategy: "label", build: () => page.getByLabel(target.label!, { exact: false }) });
  }
  if (target.attributes && Object.keys(target.attributes).length > 0) {
    candidates.push({ strategy: "attributes", build: () => buildAttributeLocator(page, target.attributes!, target.tagName) });
  }
  if (target.placeholder) {
    candidates.push({ strategy: "placeholder", build: () => page.getByPlaceholder(target.placeholder!, { exact: false }) });
  }
  if (target.text) {
    candidates.push({ strategy: "text", build: () => page.getByText(target.text!, { exact: false }) });
  }
  if (target.css) {
    candidates.push({ strategy: "css", build: () => page.locator(target.css!) });
  }
  if (target.xpath) {
    candidates.push({ strategy: "xpath", build: () => page.locator(`xpath=${target.xpath}`) });
  }

  for (const candidate of candidates) {
    try {
      let loc = candidate.build();
      if (typeof target.nth === "number") loc = loc.nth(target.nth);
      const count = await loc.count();
      if (count === 1) return loc;
      if (count > 1) {
        onWarn?.(`Selector strategy "${candidate.strategy}" matched ${count} elements; using the first match.`);
        return loc.first();
      }
    } catch {
      continue;
    }
  }

  throw new SelectorResolutionError(
    "Element could not be identified safely. All selector strategies failed to resolve a unique match.",
    target
  );
}
