import { describe, it, expect } from "vitest";
import { generateClientId } from "../id.js";

describe("generateClientId", () => {
  it("prefixes the id as requested", () => {
    expect(generateClientId("node")).toMatch(/^node_/);
  });

  it("generates unique ids across many calls", () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateClientId("x")));
    expect(ids.size).toBe(200);
  });
});
