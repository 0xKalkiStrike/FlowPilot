import type { Page } from "playwright";
import type { ElementTarget } from "@flowpilot/workflow-schema";
import { resolveLocator, type SelectorResolutionError } from "@flowpilot/browser-engine";
import { resolveTemplate } from "@flowpilot/shared";

export interface ConditionConfig {
  conditionType: string;
  expected?: string;
  variableName?: string;
}

export async function evaluateCondition(
  cfg: ConditionConfig,
  target: ElementTarget | undefined,
  page: Page,
  variables: Record<string, unknown>
): Promise<boolean> {
  const expected = cfg.expected ? resolveTemplate(cfg.expected, variables) : "";
  switch (cfg.conditionType) {
    case "elementExists": {
      if (!target) return false;
      try {
        await resolveLocator(page, target);
        return true;
      } catch {
        return false;
      }
    }
    case "elementVisible": {
      if (!target) return false;
      try {
        const loc = await resolveLocator(page, target);
        return await loc.isVisible();
      } catch {
        return false;
      }
    }
    case "textContains": {
      const content = await page.content();
      return content.includes(expected);
    }
    case "textEquals": {
      if (!target) return false;
      try {
        const loc = await resolveLocator(page, target);
        const text = ((await loc.textContent()) ?? "").trim();
        return text === expected;
      } catch {
        return false;
      }
    }
    case "valueEquals": {
      if (!target) return false;
      try {
        const loc = await resolveLocator(page, target);
        const value = await loc.inputValue().catch(() => "");
        return value === expected;
      } catch {
        return false;
      }
    }
    case "valueGreaterThan": {
      if (!target) return false;
      try {
        const loc = await resolveLocator(page, target);
        const value = parseFloat(await loc.inputValue().catch(() => "0"));
        return value > parseFloat(expected);
      } catch {
        return false;
      }
    }
    case "urlContains": {
      return page.url().includes(expected);
    }
    case "variableExists": {
      const name = cfg.variableName ?? "";
      return variables[name] !== undefined && variables[name] !== null && variables[name] !== "";
    }
    case "workflowStatus": {
      return true;
    }
    case "customExpression": {
      return evaluateSafeExpression(resolveTemplate(cfg.expected ?? "", variables));
    }
    default:
      return false;
  }
}

/**
 * A deliberately small, safe boolean-expression evaluator. It never calls
 * eval()/new Function() (spec section 40: no arbitrary server execution).
 * Supports: A && B, A || B (single level, left-to-right, no nested
 * parentheses) where each atom is `LEFT OP RIGHT` with OP one of
 * == != > < >= <= contains, and LEFT/RIGHT are numbers, quoted strings,
 * true/false, or already-resolved template output.
 */
export function evaluateSafeExpression(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;
  if (trimmed.includes("&&")) return trimmed.split("&&").every((p) => evaluateSafeExpression(p));
  if (trimmed.includes("||")) return trimmed.split("||").some((p) => evaluateSafeExpression(p));

  const match = trimmed.match(/^(.+?)\s*(==|!=|>=|<=|>|<|contains)\s*(.+)$/);
  if (!match) return trimmed.toLowerCase() === "true";
  const [, rawLeft, op, rawRight] = match;
  const left = parseLiteral(rawLeft.trim());
  const right = parseLiteral(rawRight.trim());

  switch (op) {
    case "==": return String(left) === String(right);
    case "!=": return String(left) !== String(right);
    case ">": return Number(left) > Number(right);
    case "<": return Number(left) < Number(right);
    case ">=": return Number(left) >= Number(right);
    case "<=": return Number(left) <= Number(right);
    case "contains": return String(left).includes(String(right));
    default: return false;
  }
}

function parseLiteral(raw: string): string | number | boolean {
  if (/^["'].*["']$/.test(raw)) return raw.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}
