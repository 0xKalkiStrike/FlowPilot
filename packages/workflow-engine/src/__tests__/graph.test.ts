import { describe, it, expect } from "vitest";
import { buildChain } from "../graph.js";
import type { WorkflowNode, WorkflowEdge } from "@flowpilot/workflow-schema";

function n(id: string, extra: Partial<WorkflowNode> = {}): WorkflowNode {
  return { id, type: "utility.log", position: { x: 0, y: 0 }, config: {}, ...extra };
}
function e(source: string, target: string): WorkflowEdge {
  return { id: `${source}-${target}`, source, target };
}

describe("buildChain", () => {
  it("orders a simple top-level chain", () => {
    const nodes = [n("a"), n("b"), n("c")];
    const edges = [e("a", "b"), e("b", "c")];
    const chain = buildChain(nodes, edges, null, null);
    expect(chain.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("resolves a loop body scoped by parentId + branch", () => {
    const nodes = [
      n("loop1", { type: "logic.loopRepeat" }),
      n("body1", { parentId: "loop1", branch: "loop" }),
      n("body2", { parentId: "loop1", branch: "loop" }),
    ];
    const edges = [e("body1", "body2")];
    const chain = buildChain(nodes, edges, "loop1", "loop");
    expect(chain.map((x) => x.id)).toEqual(["body1", "body2"]);
  });

  it("keeps IF branches separate", () => {
    const nodes = [
      n("if1", { type: "logic.if" }),
      n("t1", { parentId: "if1", branch: "true" }),
      n("f1", { parentId: "if1", branch: "false" }),
    ];
    const trueChain = buildChain(nodes, [], "if1", "true");
    const falseChain = buildChain(nodes, [], "if1", "false");
    expect(trueChain.map((x) => x.id)).toEqual(["t1"]);
    expect(falseChain.map((x) => x.id)).toEqual(["f1"]);
  });

  it("returns an empty array for a scope with no nodes", () => {
    expect(buildChain([], [], null, null)).toEqual([]);
  });
});
