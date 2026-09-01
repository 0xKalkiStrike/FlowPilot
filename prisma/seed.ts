import path from "node:path";
import { createDb } from "../apps/server/src/db/sqlite.js";
import { env } from "../apps/server/src/env.js";
import { WorkflowDocumentSchema, WORKFLOW_SCHEMA_VERSION, type WorkflowDocument } from "@flowpilot/workflow-schema";
import { hashPassword, generateId } from "@flowpilot/shared";

// Reuse the server's own env resolution (which already loads .env and
// resolves STORAGE_DIR etc. relative to apps/server) so the seed script can
// never point at a different database file than the server actually reads
// from — the two used to compute this path independently and could drift.
const prisma = createDb(path.join(env.storageDir, "flowpilot.db"));

function chain(nodesSpec: any[], startY = 80): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  let y = startY;
  let prevId: string | null = null;
  for (let i = 0; i < nodesSpec.length; i++) {
    const spec = nodesSpec[i];
    const id = spec.id ?? `n${i + 1}`;
    nodes.push({ position: { x: 320, y }, ...spec, id });
    if (!spec.parentId) {
      if (prevId) edges.push({ id: `e_${prevId}_${id}`, source: prevId, target: id });
      prevId = id;
      y += 150;
    }
  }
  return { nodes, edges };
}

function doc(name: string, description: string, nodesSpec: any[], extraEdges: any[] = [], opts: Partial<WorkflowDocument> = {}): WorkflowDocument {
  const { nodes, edges } = chain(nodesSpec);
  return WorkflowDocumentSchema.parse({
    schemaVersion: WORKFLOW_SCHEMA_VERSION, name, description,
    nodes, edges: [...edges, ...extraEdges],
    trigger: { type: "manual", config: {} },
    variables: [],
    browserConfig: { headless: false },
    ...opts,
  });
}

async function main() {
  console.log("Seeding FlowPilot...");

  // ---- Demo user + workspace (no website credentials are seeded) ----
  const demoEmail = "demo@flowpilot.local";
  let user = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!user) {
    const { hash, salt } = hashPassword("FlowPilot123!");
    user = await prisma.user.create({
      data: { id: generateId("user"), email: demoEmail, passwordHash: hash, passwordSalt: salt, name: "Demo User" },
    });
    await prisma.workspace.create({ data: { id: generateId("ws"), name: "Demo Workspace", ownerId: user.id } });
    console.log(`Created demo user ${demoEmail} / FlowPilot123!`);
  } else {
    console.log("Demo user already exists, skipping.");
  }

  // ---- Built-in templates (spec section 35 + the full example in section 69) ----
  const templates: Array<{ name: string; description: string; category: string; workflow: WorkflowDocument }> = [
    {
      name: "Daily Website Login",
      category: "Authentication",
      description: "Logs into a website daily using variables for credentials, then confirms the account page loaded.",
      workflow: doc(
        "Daily Website Login",
        "Opens a site, fills email/password from variables, logs in, and waits for the account page.",
        [
          { type: "browser.open", label: "Open login page", config: { url: "https://example.com/login" } },
          { type: "form.email", label: "Enter email", config: { value: "{{email}}" }, target: { css: "input[type=email]" } },
          { type: "form.password", label: "Enter password", config: {}, target: { css: "input[type=password]" } },
          { type: "interaction.click", label: "Click Login", config: {}, target: { role: "button", name: "Log in" } },
          { type: "browser.waitForNavigation", label: "Wait for account page", config: {} },
          { type: "browser.screenshot", label: "Screenshot result", config: { fullPage: true } },
        ],
        [],
        { trigger: { type: "schedule", config: { frequency: "daily", time: "09:00", timezone: "Asia/Kolkata" } },
          variables: [{ name: "email", type: "string", sensitive: false }, { name: "password", type: "string", sensitive: true }] }
      ),
    },
    {
      name: "Product Cart Automation",
      category: "E-commerce",
      description: "The full example from the spec: search a product, select a dropdown, set quantity to 5, add to cart, screenshot, and save the product name as JSON.",
      workflow: doc(
        "Daily Product Automation",
        "Open website, login using credential, search product, open product, select dropdown, add to cart, set quantity to 5, screenshot, extract product name, save JSON.",
        [
          { type: "browser.open", label: "Open website", config: { url: "https://example.com" } },
          { type: "form.search", label: "Search product", config: { value: "{{product}}" }, target: { role: "searchbox" } },
          { type: "interaction.pressEnter", label: "Submit search", config: {} },
          { type: "interaction.click", label: "Open product", config: {}, target: { role: "link", name: "{{product}}" } },
          { type: "form.dropdown", label: "Select size/variant", config: { value: "Default" }, target: { css: "select[name=variant]" } },
          { type: "form.quantity", label: "Set quantity to 5", config: { desiredQuantity: 5, strategy: "auto" }, target: { css: "input[name=quantity]" } },
          { type: "interaction.click", label: "Add to cart", config: {}, target: { role: "button", name: "Add to cart" } },
          { type: "browser.screenshot", label: "Screenshot cart", config: { fullPage: true } },
          { type: "data.extractText", label: "Extract product name", config: { variableName: "productName" }, target: { css: "h1" } },
          { type: "data.saveJson", label: "Save JSON", config: { variableName: "productName", fileName: "product.json" } },
        ],
        [],
        { trigger: { type: "schedule", config: { frequency: "daily", time: "09:00", timezone: "Asia/Kolkata" } },
          variables: [{ name: "product", type: "string", defaultValue: "" }] }
      ),
    },
    {
      name: "Form Submission",
      category: "Forms",
      description: "Fills out a multi-field contact form and submits it.",
      workflow: doc("Form Submission", "Fills name, email, and message fields, then submits.", [
        { type: "browser.open", label: "Open form page", config: { url: "https://example.com/contact" } },
        { type: "form.text", label: "Enter name", config: { value: "{{name}}" }, target: { label: "Name" } },
        { type: "form.email", label: "Enter email", config: { value: "{{email}}" }, target: { label: "Email" } },
        { type: "form.textarea", label: "Enter message", config: { value: "{{message}}" }, target: { label: "Message" } },
        { type: "interaction.click", label: "Submit", config: {}, target: { role: "button", name: "Submit" } },
      ], [], { variables: [{ name: "name", type: "string" }, { name: "email", type: "string" }, { name: "message", type: "string" }] }),
    },
    {
      name: "Data Extraction",
      category: "Data",
      description: "Extracts a table and a set of links from a page and saves both to files.",
      workflow: doc("Data Extraction", "Extracts a table and links, saving them as CSV and JSON.", [
        { type: "browser.open", label: "Open page", config: { url: "https://example.com/data" } },
        { type: "data.extractTable", label: "Extract table", config: { variableName: "tableData" }, target: { css: "table" } },
        { type: "data.saveCsv", label: "Save table as CSV", config: { variableName: "tableData", fileName: "table.csv" } },
        { type: "data.extractLinks", label: "Extract links", config: { variableName: "links" } },
        { type: "data.saveJson", label: "Save links as JSON", config: { variableName: "links", fileName: "links.json" } },
      ]),
    },
    {
      name: "Daily Report",
      category: "Reporting",
      description: "Runs every morning, extracts key numbers from a dashboard, and saves a dated report.",
      workflow: doc("Daily Report", "Scheduled extraction of dashboard metrics into a JSON report.", [
        { type: "browser.open", label: "Open dashboard", config: { url: "https://example.com/dashboard" } },
        { type: "data.extractText", label: "Extract revenue", config: { variableName: "revenue" }, target: { css: "[data-field=revenue]" } },
        { type: "data.extractText", label: "Extract signups", config: { variableName: "signups" }, target: { css: "[data-field=signups]" } },
        { type: "data.setVariable", label: "Combine report", config: { name: "report", value: "{{revenue}} / {{signups}}" } },
        { type: "data.saveJson", label: "Save report", config: { variableName: "report", fileName: "daily-report.json" } },
      ], [], { trigger: { type: "schedule", config: { frequency: "daily", time: "08:00", timezone: "Asia/Kolkata" } } }),
    },
    {
      name: "Website Monitoring",
      category: "Monitoring",
      description: "Checks whether a page shows 'Out of Stock' and stops with a clear status either way.",
      workflow: doc("Website Monitoring", "IF the target text exists, stop as failed; otherwise stop as success.", [
        { type: "browser.open", label: "Open product page", config: { url: "https://example.com/product" } },
        { type: "logic.if", id: "if1", label: "Out of stock?", config: { conditionType: "textContains", expected: "Out of Stock" } },
        { type: "logic.stop", id: "stop_true", parentId: "if1", branch: "true", label: "Stop: out of stock", config: { status: "failed", message: "Product is out of stock." } },
        { type: "logic.stop", id: "stop_false", parentId: "if1", branch: "false", label: "Stop: in stock", config: { status: "success", message: "Product is in stock." } },
      ], [], { trigger: { type: "schedule", config: { frequency: "interval", intervalMinutes: 30, timezone: "Asia/Kolkata" } } }),
    },
    {
      name: "Login + Download File",
      category: "Files",
      description: "Logs in, navigates to a reports page, and downloads the latest file.",
      workflow: doc("Login + Download File", "Logs in and downloads a report, recording it in the execution's Files tab.", [
        { type: "browser.open", label: "Open login page", config: { url: "https://example.com/login" } },
        { type: "form.email", label: "Enter email", config: { value: "{{email}}" }, target: { css: "input[type=email]" } },
        { type: "form.password", label: "Enter password", config: {}, target: { css: "input[type=password]" } },
        { type: "interaction.click", label: "Click Login", config: {}, target: { role: "button", name: "Log in" } },
        { type: "browser.open", label: "Open reports page", config: { url: "https://example.com/reports" } },
        { type: "interaction.downloadFile", label: "Download latest report", config: {}, target: { role: "link", name: "Download" } },
      ], [], { variables: [{ name: "email", type: "string" }, { name: "password", type: "string", sensitive: true }] }),
    },
    {
      name: "Table Scraping",
      category: "Data",
      description: "Loops through paginated tables, extracting every page into one CSV file.",
      workflow: doc("Table Scraping", "Repeats: extract table, save rows, click Next — 5 times.", [
        { type: "browser.open", label: "Open listing page", config: { url: "https://example.com/list" } },
        { type: "logic.loopRepeat", id: "loop1", label: "Repeat 5 pages", config: { times: 5 } },
        { type: "data.extractTable", id: "body1", parentId: "loop1", branch: "loop", label: "Extract table", config: { variableName: "tableData" }, target: { css: "table" } },
        { type: "data.saveCsv", id: "body2", parentId: "loop1", branch: "loop", label: "Save page CSV", config: { variableName: "tableData", fileName: "table-{{loopIndex}}.csv" } },
        { type: "interaction.click", id: "body3", parentId: "loop1", branch: "loop", label: "Click Next", config: {}, target: { role: "button", name: "Next" } },
      ], [
        { id: "e_body1_body2", source: "body1", target: "body2" },
        { id: "e_body2_body3", source: "body2", target: "body3" },
      ]),
    },
    {
      name: "Discord Message Automation",
      category: "Connectors",
      description: "Opens Discord, navigates to a channel, and sends a message — entirely through the normal browser UI.",
      workflow: doc("Discord Message Automation", "Browser-based Discord automation (no bot token needed).", [
        { type: "browser.open", label: "Open Discord", config: { url: "https://discord.com/channels/@me" } },
        { type: "service.browserAction", label: "Discord: navigate to channel", config: { connector: "discord", action: "navigate-channel" } },
        { type: "interaction.click", label: "Click message box", config: {}, target: { role: "textbox" } },
        { type: "interaction.typeText", label: "Type message", config: { value: "{{message}}" }, target: { role: "textbox" } },
        { type: "interaction.pressEnter", label: "Send message", config: {} },
      ], [], { variables: [{ name: "message", type: "string", defaultValue: "Hello from FlowPilot!" }] }),
    },
    {
      name: "Deployment Monitoring",
      category: "Connectors",
      description: "Checks a Vercel/Render project's latest deployment status through the dashboard UI.",
      workflow: doc("Deployment Monitoring", "Opens the deployment dashboard and extracts the latest status.", [
        { type: "browser.open", label: "Open deployments", config: { url: "https://vercel.com/dashboard" } },
        { type: "service.browserAction", label: "Select project", config: { connector: "vercel", action: "select-project" } },
        { type: "data.extractText", label: "Extract latest status", config: { variableName: "deployStatus" }, target: { css: "[data-testid=deployment-status]" } },
        { type: "logic.if", id: "if1", label: "Deployment failed?", config: { conditionType: "textEquals", expected: "Failed" }, target: { css: "[data-testid=deployment-status]" } },
        { type: "utility.log", id: "log_true", parentId: "if1", branch: "true", label: "Log failure", config: { level: "error", message: "Deployment failed! {{deployStatus}}" } },
        { type: "utility.log", id: "log_false", parentId: "if1", branch: "false", label: "Log success", config: { level: "info", message: "Deployment OK: {{deployStatus}}" } },
      ], [], { trigger: { type: "schedule", config: { frequency: "interval", intervalMinutes: 15, timezone: "Asia/Kolkata" } } }),
    },
  ];

  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name, isBuiltIn: true } });
    if (existing) continue;
    await prisma.template.create({
      data: {
        id: generateId("tpl"), name: t.name, description: t.description, category: t.category,
        workflowJson: JSON.stringify(t.workflow), isBuiltIn: true,
      },
    });
  }

  console.log(`Seeded ${templates.length} built-in templates.`);
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
