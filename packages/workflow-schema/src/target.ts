import { z } from "zod";

/**
 * A multi-strategy element target. When executing a node that acts on a page
 * element, the browser engine tries each populated strategy in priority
 * order until one resolves to a unique, visible element.
 *
 * Priority order (highest confidence first):
 *   1. testId          - data-testid / data-test / data-qa attributes
 *   2. role + name      - ARIA role and accessible name (Playwright getByRole)
 *   3. label            - associated <label> text (Playwright getByLabel)
 *   4. attributes       - stable attributes (name, id, type, placeholder)
 *   5. text             - visible text content (Playwright getByText)
 *   6. css              - CSS selector captured at recording time
 *   7. xpath            - XPath, used only as a last resort
 */
export const ElementTargetSchema = z.object({
  role: z.string().optional(),
  name: z.string().optional(),
  label: z.string().optional(),
  text: z.string().optional(),
  placeholder: z.string().optional(),
  testId: z.string().optional(),
  css: z.string().optional(),
  xpath: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  tagName: z.string().optional(),
  inputType: z.string().optional(),
  frameUrl: z.string().optional(),
  nth: z.number().int().nonnegative().optional(),
});
export type ElementTarget = z.infer<typeof ElementTargetSchema>;

export const SELECTOR_STRATEGY_ORDER = [
  "testId",
  "role",
  "label",
  "attributes",
  "text",
  "css",
  "xpath",
] as const;
export type SelectorStrategy = (typeof SELECTOR_STRATEGY_ORDER)[number];
