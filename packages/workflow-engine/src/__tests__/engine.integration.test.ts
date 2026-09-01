import { describe, it, expect } from "vitest";
import { WorkflowEngine } from "../engine.js";
import { WorkflowDocumentSchema, WORKFLOW_SCHEMA_VERSION, ExecutionStatus } from "@flowpilot/workflow-schema";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

async function tmpDir(name: string) {
  const dir = path.join(os.tmpdir(), `flowpilot-test-${name}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

describe("WorkflowEngine (integration)", () => {
  it("runs a simple open + click + extract workflow end to end against a data: URL", async () => {
    const html = `data:text/html,${encodeURIComponent(`
      <html><body>
        <button data-testid="go">Click me</button>
        <p id="result" data-testid="result">not clicked</p>
        <script>
          document.querySelector('[data-testid=go]').addEventListener('click', () => {
            document.getElementById('result').textContent = 'clicked!';
          });
        </script>
      </body></html>
    `)}`;

    const doc = WorkflowDocumentSchema.parse({
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      name: "Integration Test",
      trigger: { type: "manual", config: {} },
      browserConfig: { headless: true, defaultTimeoutMs: 10000 },
      nodes: [
        { id: "n1", type: "browser.open", position: { x: 0, y: 0 }, config: { url: html } },
        { id: "n2", type: "interaction.click", position: { x: 0, y: 100 }, config: {}, target: { testId: "go" } },
        { id: "n3", type: "data.extractText", position: { x: 0, y: 200 }, config: { variableName: "result" }, target: { testId: "result" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    });

    const storageDir = await tmpDir("storage");
    const events: any[] = [];

    const engine = new WorkflowEngine();
    const result = await engine.run({
      workflow: doc,
      executionId: "exec_test1",
      storageDir,
      screenshotsDir: await tmpDir("screenshots"),
      downloadsDir: await tmpDir("downloads"),
      uploadsDir: await tmpDir("uploads"),
      browserProfilesDir: await tmpDir("profiles"),
      resolveCredential: async () => undefined,
      onEvent: (e) => events.push(e),
      isCancelled: () => false,
    });

    expect(result.status).toBe(ExecutionStatus.SUCCESS);
    expect(result.variables.result).toBe("clicked!");
    expect(events.some((e) => e.type === "status" && e.payload.status === ExecutionStatus.RUNNING)).toBe(true);
  }, 30000);

  it("stops with FAILED status and a clear message when a required field is missing", async () => {
    const doc = WorkflowDocumentSchema.parse({
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      name: "Missing URL",
      browserConfig: { headless: true },
      nodes: [{ id: "n1", type: "browser.open", position: { x: 0, y: 0 }, config: {} }],
      edges: [],
    });

    const engine = new WorkflowEngine();
    const result = await engine.run({
      workflow: doc,
      executionId: "exec_test2",
      storageDir: await tmpDir("storage2"),
      screenshotsDir: await tmpDir("screenshots2"),
      downloadsDir: await tmpDir("downloads2"),
      uploadsDir: await tmpDir("uploads2"),
      browserProfilesDir: await tmpDir("profiles2"),
      resolveCredential: async () => undefined,
      onEvent: () => {},
      isCancelled: () => false,
    });

    expect(result.status).toBe(ExecutionStatus.FAILED);
    expect(result.error).toMatch(/URL is required/);
  }, 30000);

  it("runs a Repeat N Times loop the correct number of iterations", async () => {
    const doc = WorkflowDocumentSchema.parse({
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      name: "Loop Test",
      browserConfig: { headless: true },
      nodes: [
        { id: "n1", type: "browser.open", position: { x: 0, y: 0 }, config: { url: "data:text/html,<html></html>" } },
        { id: "n2", type: "data.setVariable", position: { x: 0, y: 100 }, config: { name: "counter", value: "0" } },
        { id: "loop1", type: "logic.loopRepeat", position: { x: 0, y: 200 }, config: { times: 4 } },
        { id: "body1", type: "data.setVariable", position: { x: 100, y: 300 }, parentId: "loop1", branch: "loop", config: { name: "counter", operation: "increment", value: "1" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "loop1" },
      ],
    });

    const engine = new WorkflowEngine();
    const result = await engine.run({
      workflow: doc,
      executionId: "exec_test3",
      storageDir: await tmpDir("storage3"),
      screenshotsDir: await tmpDir("screenshots3"),
      downloadsDir: await tmpDir("downloads3"),
      uploadsDir: await tmpDir("uploads3"),
      browserProfilesDir: await tmpDir("profiles3"),
      resolveCredential: async () => undefined,
      onEvent: () => {},
      isCancelled: () => false,
    });

    expect(result.status).toBe(ExecutionStatus.SUCCESS);
    expect(result.variables.counter).toBe(4);
  }, 30000);
});
