import { describe, it, expect } from "vitest";
import { WorkflowDocumentSchema, validateWorkflowStructure, WORKFLOW_SCHEMA_VERSION } from "../workflow.js";
import { NODE_REGISTRY, getNodeDefinition, listNodesByCategory } from "../nodeRegistry.js";

describe("WorkflowDocumentSchema", () => {
  it("parses a minimal valid workflow", () => {
    const doc = WorkflowDocumentSchema.parse({
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      name: "Test",
      nodes: [{ id: "n1", type: "browser.open", position: { x: 0, y: 0 }, config: { url: "https://example.com" } }],
      edges: [],
    });
    expect(doc.name).toBe("Test");
    expect(doc.trigger.type).toBe("manual");
  });

  it("rejects an unsupported schema version", () => {
    expect(() =>
      WorkflowDocumentSchema.parse({ schemaVersion: "2.0", name: "Test", nodes: [], edges: [] })
    ).toThrow();
  });
});

describe("validateWorkflowStructure", () => {
  it("flags a workflow with no nodes", () => {
    const doc = WorkflowDocumentSchema.parse({ schemaVersion: WORKFLOW_SCHEMA_VERSION, name: "Empty", nodes: [], edges: [] });
    const issues = validateWorkflowStructure(doc);
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("flags an edge referencing a missing node", () => {
    const doc = WorkflowDocumentSchema.parse({
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      name: "Bad edge",
      nodes: [{ id: "n1", type: "browser.open", position: { x: 0, y: 0 }, config: {} }],
      edges: [{ id: "e1", source: "n1", target: "missing" }],
    });
    const issues = validateWorkflowStructure(doc);
    expect(issues.some((i) => i.message.includes("missing target"))).toBe(true);
  });

  it("accepts a valid two-node chain", () => {
    const doc = WorkflowDocumentSchema.parse({
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      name: "Chain",
      nodes: [
        { id: "n1", type: "browser.open", position: { x: 0, y: 0 }, config: { url: "https://example.com" } },
        { id: "n2", type: "interaction.click", position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2" }],
    });
    const issues = validateWorkflowStructure(doc);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

describe("NODE_REGISTRY", () => {
  it("has more than 50 node types", () => {
    expect(Object.keys(NODE_REGISTRY).length).toBeGreaterThan(50);
  });

  it("every node has a unique type matching its key", () => {
    for (const [key, def] of Object.entries(NODE_REGISTRY)) {
      expect(def.type).toBe(key);
    }
  });

  it("getNodeDefinition resolves a known type", () => {
    expect(getNodeDefinition("browser.open")?.label).toBe("Open URL");
    expect(getNodeDefinition("nonexistent.type")).toBeUndefined();
  });

  it("listNodesByCategory groups all categories", () => {
    const byCategory = listNodesByCategory();
    expect(byCategory.browser.length).toBeGreaterThan(0);
    expect(byCategory.forms.length).toBeGreaterThan(0);
    expect(byCategory.logic.length).toBeGreaterThan(0);
  });
});
