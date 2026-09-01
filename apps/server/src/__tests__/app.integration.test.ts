import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Point the app at an isolated, throwaway storage directory *before* env.ts
// (and therefore db.ts) is ever imported, so these tests never touch the
// developer's real flowpilot.db.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "flowpilot-server-test-"));
process.env.STORAGE_DIR = path.join(tmpRoot, "storage");
process.env.SCREENSHOTS_DIR = path.join(tmpRoot, "screenshots");
process.env.DOWNLOADS_DIR = path.join(tmpRoot, "storage/downloads");
process.env.UPLOADS_DIR = path.join(tmpRoot, "storage/uploads");
process.env.BROWSER_PROFILES_DIR = path.join(tmpRoot, "storage/browser-profiles");
process.env.JWT_SECRET = "test-secret-for-flowpilot-server-tests";
process.env.CREDENTIAL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../app.js");

type Cookies = Record<string, string>;

function parseCookies(setCookieHeaders: string[] | undefined): Cookies {
  const out: Cookies = {};
  for (const header of setCookieHeaders ?? []) {
    const [pair] = header.split(";");
    const idx = pair.indexOf("=");
    out[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return out;
}

function cookieHeader(cookies: Cookies): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

describe("FlowPilot server (integration)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("responds to the health check", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, name: "FlowPilot" });
  });

  it("rejects unauthenticated access to a protected route", async () => {
    const res = await app.inject({ method: "GET", url: "/api/workflows" });
    expect(res.statusCode).toBe(401);
  });

  describe("with a registered user", () => {
    let cookies: Cookies;

    beforeEach(async () => {
      const email = `user-${Math.random().toString(36).slice(2)}@example.com`;
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { name: "Test User", email, password: "password123", workspaceName: "Test Workspace" },
      });
      expect(res.statusCode).toBe(201);
      cookies = parseCookies(res.cookies.map((c) => `${c.name}=${c.value}`));
    });

    it("rejects a mutating request without a matching CSRF header", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/workflows",
        headers: { cookie: cookieHeader(cookies) },
        payload: { name: "No CSRF" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("creates, lists, fetches, validates, and deletes a workflow end to end", async () => {
      const authedHeaders = { cookie: cookieHeader(cookies), "x-csrf-token": cookies["flowpilot_csrf"] };

      const create = await app.inject({
        method: "POST",
        url: "/api/workflows",
        headers: authedHeaders,
        payload: { name: "My First Workflow", description: "Created by an integration test." },
      });
      expect(create.statusCode).toBe(201);
      const created = create.json();
      expect(created.id).toBeTruthy();
      expect(created.name).toBe("My First Workflow");
      expect(created.nodes).toEqual([]);

      const list = await app.inject({ method: "GET", url: "/api/workflows", headers: authedHeaders });
      expect(list.statusCode).toBe(200);
      expect(list.json()).toHaveLength(1);
      expect(list.json()[0].id).toBe(created.id);

      const fetched = await app.inject({ method: "GET", url: `/api/workflows/${created.id}`, headers: authedHeaders });
      expect(fetched.statusCode).toBe(200);
      expect(fetched.json().name).toBe("My First Workflow");

      // An empty workflow (no root/nodes) should surface a structural validation issue,
      // not be silently treated as runnable.
      const validate = await app.inject({ method: "GET", url: `/api/workflows/${created.id}/validate`, headers: authedHeaders });
      expect(validate.statusCode).toBe(200);
      expect(validate.json().canRun).toBe(false);
      expect(validate.json().issues.length).toBeGreaterThan(0);

      const del = await app.inject({ method: "DELETE", url: `/api/workflows/${created.id}`, headers: authedHeaders });
      expect(del.statusCode).toBe(200);

      const listAfterDelete = await app.inject({ method: "GET", url: "/api/workflows", headers: authedHeaders });
      expect(listAfterDelete.json()).toHaveLength(0);
    });

    it("imports a workflow document containing real nodes and edges, and can export it back out", async () => {
      const authedHeaders = { cookie: cookieHeader(cookies), "x-csrf-token": cookies["flowpilot_csrf"] };

      const doc = {
        schemaVersion: "1.0",
        name: "Imported Workflow",
        description: "",
        trigger: { type: "manual", config: {} },
        variables: [],
        browserConfig: { headless: true },
        nodes: [
          { id: "n1", type: "browser.open", label: "Open example.com", position: { x: 0, y: 0 }, config: { url: "https://example.com" } },
        ],
        edges: [],
      };

      const imported = await app.inject({
        method: "POST",
        url: "/api/workflows/import",
        headers: authedHeaders,
        payload: doc,
      });
      expect(imported.statusCode).toBe(201);
      const importedBody = imported.json();
      expect(importedBody.nodes).toHaveLength(1);
      expect(importedBody.nodes[0].type).toBe("browser.open");

      const exported = await app.inject({
        method: "GET",
        url: `/api/workflows/${importedBody.id}/export`,
        headers: authedHeaders,
      });
      expect(exported.statusCode).toBe(200);
      expect(exported.json().nodes[0].config.url).toBe("https://example.com");
    });

    it("runs a workflow end to end against a real headless browser and records logs", async () => {
      const authedHeaders = { cookie: cookieHeader(cookies), "x-csrf-token": cookies["flowpilot_csrf"] };

      const doc = {
        schemaVersion: "1.0",
        name: "Runnable Workflow",
        description: "",
        trigger: { type: "manual", config: {} },
        variables: [],
        browserConfig: { headless: true },
        nodes: [
          {
            id: "n1", type: "browser.open", label: "Open test page", position: { x: 0, y: 0 },
            config: {
              url:
                "data:text/html,<html><body><button id=\"go\" onclick=\"document.getElementById('out').innerText='clicked'\">Go</button><div id=\"out\"></div></body></html>",
            },
          },
          { id: "n2", type: "interaction.click", label: "Click button", position: { x: 0, y: 100 }, config: {}, target: { css: "#go" } },
          { id: "n3", type: "data.extractText", label: "Extract result", position: { x: 0, y: 200 }, config: { variableName: "result" }, target: { css: "#out" } },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2" },
          { id: "e2", source: "n2", target: "n3" },
        ],
      };

      const imported = await app.inject({ method: "POST", url: "/api/workflows/import", headers: authedHeaders, payload: doc });
      expect(imported.statusCode).toBe(201);
      const workflowId = imported.json().id;

      const run = await app.inject({ method: "POST", url: `/api/workflows/${workflowId}/run`, headers: authedHeaders });
      expect(run.statusCode).toBe(202);
      const { executionId } = run.json();
      expect(executionId).toBeTruthy();

      // The engine runs asynchronously (fire-and-forget from the route
      // handler's point of view); poll until it reports finished.
      let finalExecution: any;
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const poll = await app.inject({ method: "GET", url: `/api/executions/${executionId}`, headers: authedHeaders });
        expect(poll.statusCode).toBe(200);
        const body = poll.json();
        if (body.finishedAt) {
          finalExecution = body;
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      expect(finalExecution).toBeDefined();
      expect(finalExecution.status).toBe("SUCCESS");
      expect(finalExecution.variables.result).toBe("clicked");
      expect(finalExecution.logs.length).toBeGreaterThan(0);
    }, 25000);
  });
});
