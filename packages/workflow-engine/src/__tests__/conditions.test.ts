import { describe, it, expect } from "vitest";
import { evaluateSafeExpression } from "../conditions.js";

describe("evaluateSafeExpression", () => {
  it("evaluates numeric comparisons", () => {
    expect(evaluateSafeExpression("5 > 3")).toBe(true);
    expect(evaluateSafeExpression("5 < 3")).toBe(false);
    expect(evaluateSafeExpression("5 >= 5")).toBe(true);
  });

  it("evaluates string equality", () => {
    expect(evaluateSafeExpression('"abc" == "abc"')).toBe(true);
    expect(evaluateSafeExpression('"abc" != "xyz"')).toBe(true);
  });

  it("evaluates contains", () => {
    expect(evaluateSafeExpression('"hello world" contains "world"')).toBe(true);
  });

  it("evaluates && and ||", () => {
    expect(evaluateSafeExpression("5 > 3 && 2 < 4")).toBe(true);
    expect(evaluateSafeExpression("5 < 3 || 2 < 4")).toBe(true);
    expect(evaluateSafeExpression("5 < 3 && 2 < 4")).toBe(false);
  });

  it("never executes arbitrary code", () => {
    // No eval/Function is used, so this simply fails to match a safe
    // pattern and falls back to a literal boolean check rather than running.
    expect(evaluateSafeExpression("require('fs').readFileSync('/etc/passwd')")).toBe(false);
  });
});
