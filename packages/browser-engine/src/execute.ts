import fs from "node:fs/promises";
import path from "node:path";
import type { Locator } from "playwright";
import { resolveTemplate, resolveDeep } from "@flowpilot/shared";
import { resolveLocator } from "./selector.js";
import { setQuantity } from "./quantity.js";
import { detectHumanVerification } from "./captcha.js";
import { HumanVerificationRequiredError, SelectorResolutionError, type NodeExecutionContext, type NodeExecutionResult } from "./types.js";

function cfg<T = any>(ctx: NodeExecutionContext, key: string, fallback?: T): T {
  const raw = (ctx.config as any)[key];
  const resolved = typeof raw === "string" ? resolveTemplate(raw, ctx.variables) : raw;
  return (resolved ?? fallback) as T;
}

async function target(ctx: NodeExecutionContext): Promise<Locator> {
  if (!ctx.target) throw new Error("This node requires a target element but none was configured.");
  const resolvedTarget = resolveDeep(ctx.target, ctx.variables);
  try {
    return await resolveLocator(ctx.page, resolvedTarget, (w) => ctx.log("warn", w));
  } catch (err) {
    if (err instanceof SelectorResolutionError && (await detectHumanVerification(ctx.page))) {
      throw new HumanVerificationRequiredError();
    }
    throw err;
  }
}

async function screenshot(ctx: NodeExecutionContext, suffix = ""): Promise<string> {
  await fs.mkdir(ctx.screenshotsDir, { recursive: true });
  const file = `${ctx.executionId}${suffix ? "-" + suffix : ""}-${Date.now()}.png`;
  const filePath = path.join(ctx.screenshotsDir, file);
  await ctx.page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
  return filePath;
}

type Handler = (ctx: NodeExecutionContext) => Promise<NodeExecutionResult>;
const handlers: Record<string, Handler> = {};

/* -------- Browser -------- */
handlers["browser.open"] = async (ctx) => {
  const url = cfg<string>(ctx, "url", "");
  if (!url) throw new Error("URL is required.");
  await ctx.page.goto(url, { waitUntil: cfg(ctx, "waitUntil", "load") });
  return {};
};
handlers["browser.goBack"] = async (ctx) => { await ctx.page.goBack(); return {}; };
handlers["browser.goForward"] = async (ctx) => { await ctx.page.goForward(); return {}; };
handlers["browser.reload"] = async (ctx) => { await ctx.page.reload(); return {}; };
handlers["browser.newTab"] = async (ctx) => {
  const p = await ctx.context.newPage();
  const url = cfg<string>(ctx, "url", "");
  if (url) await p.goto(url);
  return {};
};
handlers["browser.closeTab"] = async (ctx) => { await ctx.page.close(); return {}; };
handlers["browser.switchTab"] = async (ctx) => {
  const idx = cfg<number>(ctx, "index", 0);
  const pages = ctx.context.pages();
  if (!pages[idx]) throw new Error(`No tab at index ${idx}.`);
  await pages[idx].bringToFront();
  return {};
};
handlers["browser.wait"] = async (ctx) => {
  await ctx.page.waitForTimeout(cfg<number>(ctx, "durationMs", 1000));
  return {};
};
handlers["browser.waitForElement"] = async (ctx) => {
  const state = cfg<string>(ctx, "state", "visible") as any;
  if (!ctx.target) throw new Error("This node requires a target element but none was configured.");
  const resolvedTarget = resolveDeep(ctx.target, ctx.variables);
  const loc = resolvedTarget.css
    ? ctx.page.locator(resolvedTarget.css)
    : await target(ctx);
  await loc.waitFor({ state, timeout: ctx.timeoutMs });
  return {};
};
handlers["browser.waitForNavigation"] = async (ctx) => {
  await ctx.page.waitForLoadState(cfg(ctx, "waitUntil", "load"));
  return {};
};
handlers["browser.scroll"] = async (ctx) => {
  const direction = cfg<string>(ctx, "direction", "down");
  const amount = cfg<number>(ctx, "amountPx", 600);
  await ctx.page.evaluate(({ direction, amount }) => {
    if (direction === "top") window.scrollTo({ top: 0 });
    else if (direction === "bottom") window.scrollTo({ top: document.body.scrollHeight });
    else if (direction === "up") window.scrollBy(0, -amount);
    else window.scrollBy(0, amount);
  }, { direction, amount });
  return {};
};
handlers["browser.scrollToElement"] = async (ctx) => {
  const loc = await target(ctx);
  await loc.scrollIntoViewIfNeeded();
  return {};
};
handlers["browser.screenshot"] = async (ctx) => {
  const p = await screenshot(ctx, "manual");
  return { screenshotPath: p, output: { screenshotPath: p } };
};
handlers["browser.pdf"] = async (ctx) => {
  await fs.mkdir(ctx.screenshotsDir, { recursive: true });
  const filePath = path.join(ctx.screenshotsDir, `${ctx.executionId}-${Date.now()}.pdf`);
  await ctx.page.pdf({ path: filePath }).catch((e) => { throw new Error("PDF export requires headless Chromium (not supported in headed mode on all platforms): " + e.message); });
  return { output: { pdfPath: filePath } };
};
handlers["browser.setViewport"] = async (ctx) => {
  await ctx.page.setViewportSize({ width: cfg(ctx, "width", 1366), height: cfg(ctx, "height", 900) });
  return {};
};
handlers["browser.cookie"] = async (ctx) => {
  const action = cfg<string>(ctx, "action", "get");
  if (action === "clear") { await ctx.context.clearCookies(); return {}; }
  if (action === "set") {
    const name = cfg<string>(ctx, "name", "");
    const value = cfg<string>(ctx, "value", "");
    const url = ctx.page.url();
    await ctx.context.addCookies([{ name, value, url }]);
    return {};
  }
  const cookies = await ctx.context.cookies();
  const name = cfg<string>(ctx, "name", "");
  const match = name ? cookies.find((c) => c.name === name) : undefined;
  return { output: { cookies: name ? match ?? null : cookies } };
};
handlers["browser.storage"] = async (ctx) => {
  const action = cfg<string>(ctx, "action", "get");
  const key = cfg<string>(ctx, "key", "");
  if (action === "clear") { await ctx.page.evaluate(() => localStorage.clear()); return {}; }
  if (action === "set") {
    const value = cfg<string>(ctx, "value", "");
    await ctx.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
    return {};
  }
  const value = await ctx.page.evaluate((k) => localStorage.getItem(k), key);
  return { output: { value } };
};

/* -------- Interaction -------- */
handlers["interaction.click"] = async (ctx) => { await (await target(ctx)).click({ modifiers: cfg(ctx, "modifiers", []) }); return {}; };
handlers["interaction.doubleClick"] = async (ctx) => { await (await target(ctx)).dblclick({ modifiers: cfg(ctx, "modifiers", []) }); return {}; };
handlers["interaction.rightClick"] = async (ctx) => { await (await target(ctx)).click({ button: "right", modifiers: cfg(ctx, "modifiers", []) }); return {}; };
handlers["interaction.hover"] = async (ctx) => { await (await target(ctx)).hover(); return {}; };
handlers["interaction.focus"] = async (ctx) => { await (await target(ctx)).focus(); return {}; };
handlers["interaction.blur"] = async (ctx) => { await (await target(ctx)).evaluate((el: any) => el.blur()); return {}; };
handlers["interaction.typeText"] = async (ctx) => {
  const loc = await target(ctx);
  if (cfg(ctx, "clearFirst", true)) await loc.fill("");
  await loc.type(cfg<string>(ctx, "value", ""), { delay: cfg(ctx, "delayMs", 20) });
  return {};
};
handlers["interaction.clearField"] = async (ctx) => { await (await target(ctx)).fill(""); return {}; };
handlers["interaction.pressKey"] = async (ctx) => { await ctx.page.keyboard.press(cfg(ctx, "key", "Enter")); return {}; };
handlers["interaction.pressEnter"] = async (ctx) => { await ctx.page.keyboard.press("Enter"); return {}; };
handlers["interaction.pressEscape"] = async (ctx) => { await ctx.page.keyboard.press("Escape"); return {}; };
handlers["interaction.dragAndDrop"] = async (ctx) => {
  const source = await target(ctx);
  const destCss = cfg<string>(ctx, "targetSelectorCss", "");
  if (!destCss) throw new Error("A destination CSS selector is required for drag and drop.");
  await source.dragTo(ctx.page.locator(destCss));
  return {};
};
handlers["interaction.uploadFile"] = async (ctx) => {
  const filePath = cfg<string>(ctx, "filePath", "");
  if (!filePath) throw new Error("A file path is required to upload.");
  await (await target(ctx)).setInputFiles(filePath);
  return {};
};
handlers["interaction.downloadFile"] = async (ctx) => {
  const [download] = await Promise.all([ctx.page.waitForEvent("download"), (await target(ctx)).click()]);
  await fs.mkdir(ctx.downloadsDir, { recursive: true });
  const suggested = download.suggestedFilename();
  const dest = path.join(ctx.downloadsDir, `${Date.now()}-${suggested}`);
  await download.saveAs(dest);
  return { output: { filePath: dest, fileName: suggested } };
};

/* -------- Forms -------- */
async function fillLikeInput(ctx: NodeExecutionContext, value: string) {
  const loc = await target(ctx);
  await loc.fill(value);
}
for (const t of ["form.email", "form.text", "form.textarea", "form.number", "form.phone", "form.address",
  "form.city", "form.state", "form.country", "form.postalCode", "form.date", "form.time", "form.search",
  "form.cardNumber", "form.expiry", "form.cvv", "form.nameOnCard", "form.billingAddress", "form.shippingAddress"]) {
  handlers[t] = async (ctx) => { await fillLikeInput(ctx, cfg(ctx, "value", "")); return {}; };
}
handlers["form.password"] = async (ctx) => {
  const value = ctx.credential?.password ?? cfg<string>(ctx, "value", "");
  if (!value) throw new Error("No password value available. Attach a credential or set a value.");
  await fillLikeInput(ctx, value);
  return {};
};
handlers["form.checkbox"] = async (ctx) => {
  const loc = await target(ctx);
  const checked = cfg(ctx, "checked", true);
  if (checked) await loc.check(); else await loc.uncheck();
  return {};
};
handlers["form.radio"] = async (ctx) => { await (await target(ctx)).check(); return {}; };
handlers["form.dropdown"] = async (ctx) => {
  const loc = await target(ctx);
  const value = cfg<string>(ctx, "value", "");
  const matchBy = cfg<string>(ctx, "matchBy", "label");
  if (matchBy === "value") await loc.selectOption({ value });
  else await loc.selectOption({ label: value });
  return {};
};
handlers["form.multiSelect"] = async (ctx) => {
  const loc = await target(ctx);
  const values = cfg<string[]>(ctx, "values", []);
  await loc.selectOption(values.map((v) => ({ label: v })));
  return {};
};
handlers["form.fileUpload"] = handlers["interaction.uploadFile"];
handlers["form.quantity"] = async (ctx) => {
  if (!ctx.target) throw new Error("Set Quantity requires a target element.");
  const result = await setQuantity(ctx.page, resolveDeep(ctx.target, ctx.variables), {
    desiredQuantity: cfg(ctx, "desiredQuantity", 1),
    strategy: cfg(ctx, "strategy", "auto"),
    incrementSelectorCss: cfg(ctx, "incrementSelectorCss", ""),
    decrementSelectorCss: cfg(ctx, "decrementSelectorCss", ""),
    min: cfg(ctx, "min", 1),
    max: cfg(ctx, "max", 999),
  });
  return { output: result };
};

/* -------- Data extraction -------- */
handlers["data.setVariable"] = async (ctx) => {
  const name = cfg<string>(ctx, "name", "");
  if (!name) throw new Error("Variable name is required.");
  const op = cfg<string>(ctx, "operation", "set");
  const raw = cfg<string>(ctx, "value", "");
  const current = ctx.variables[name];
  let next: unknown = raw;
  if (op === "increment") next = (Number(current) || 0) + (Number(raw) || 1);
  else if (op === "decrement") next = (Number(current) || 0) - (Number(raw) || 1);
  else if (op === "append") next = `${current ?? ""}${raw}`;
  ctx.setVariable(name, next);
  return { output: { [name]: next } };
};
handlers["data.extractText"] = async (ctx) => {
  const loc = await target(ctx);
  const value = (await loc.textContent()) ?? "";
  const name = cfg<string>(ctx, "variableName", "extractedText");
  ctx.setVariable(name, value.trim());
  return { output: { [name]: value.trim() } };
};
handlers["data.extractAttribute"] = async (ctx) => {
  const loc = await target(ctx);
  const attr = cfg<string>(ctx, "attribute", "href");
  const value = (await loc.getAttribute(attr)) ?? "";
  const name = cfg<string>(ctx, "variableName", "extractedAttribute");
  ctx.setVariable(name, value);
  return { output: { [name]: value } };
};
handlers["data.extractValue"] = async (ctx) => {
  const loc = await target(ctx);
  const value = await loc.inputValue().catch(() => "");
  const name = cfg<string>(ctx, "variableName", "extractedValue");
  ctx.setVariable(name, value);
  return { output: { [name]: value } };
};
handlers["data.extractTable"] = async (ctx) => {
  const loc = await target(ctx);
  const data = await loc.evaluate((table: any) => {
    const headers = Array.from(table.querySelectorAll("thead th")).map((th: any) => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr: any) =>
      Array.from(tr.querySelectorAll("td")).map((td: any) => td.textContent.trim())
    );
    return { headers, rows };
  });
  const name = cfg<string>(ctx, "variableName", "tableData");
  ctx.setVariable(name, data);
  return { output: { [name]: data } };
};
handlers["data.extractLinks"] = async (ctx) => {
  const links = await ctx.page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map((a: any) => ({ text: a.textContent.trim(), href: a.href })));
  const name = cfg<string>(ctx, "variableName", "links");
  ctx.setVariable(name, links);
  return { output: { [name]: links } };
};
handlers["data.extractImages"] = async (ctx) => {
  const images = await ctx.page.evaluate(() => Array.from(document.querySelectorAll("img[src]")).map((i: any) => i.src));
  const name = cfg<string>(ctx, "variableName", "images");
  ctx.setVariable(name, images);
  return { output: { [name]: images } };
};
handlers["data.extractUrl"] = async (ctx) => {
  const url = ctx.page.url();
  const name = cfg<string>(ctx, "variableName", "currentUrl");
  ctx.setVariable(name, url);
  return { output: { [name]: url } };
};
handlers["data.saveJson"] = async (ctx) => {
  const varName = cfg<string>(ctx, "variableName", "");
  const fileName = cfg<string>(ctx, "fileName", "output.json");
  const value = ctx.variables[varName];
  await fs.mkdir(ctx.storageDir, { recursive: true });
  const filePath = path.join(ctx.storageDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
  return { output: { filePath } };
};
handlers["data.saveCsv"] = async (ctx) => {
  const varName = cfg<string>(ctx, "variableName", "");
  const fileName = cfg<string>(ctx, "fileName", "output.csv");
  const value = ctx.variables[varName];
  const csv = toCsv(value);
  await fs.mkdir(ctx.storageDir, { recursive: true });
  const filePath = path.join(ctx.storageDir, fileName);
  await fs.writeFile(filePath, csv, "utf8");
  return { output: { filePath } };
};

function toCsv(value: unknown): string {
  if (value && typeof value === "object" && "headers" in (value as any) && "rows" in (value as any)) {
    const { headers, rows } = value as { headers: string[]; rows: string[][] };
    return [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "object") {
      const headers = Object.keys(value[0]);
      return [headers.join(","), ...value.map((row) => headers.map((h) => csvEscape(row[h])).join(","))].join("\n");
    }
    return value.map(csvEscape).join("\n");
  }
  return String(value ?? "");
}
function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* -------- Files -------- */
handlers["file.readText"] = async (ctx) => {
  const filePath = cfg<string>(ctx, "filePath", "");
  const content = await fs.readFile(safeResolve(ctx.storageDir, filePath), "utf8");
  const name = cfg<string>(ctx, "variableName", "fileContent");
  ctx.setVariable(name, content);
  return { output: { [name]: content } };
};
handlers["file.writeText"] = async (ctx) => {
  const filePath = safeResolve(ctx.storageDir, cfg<string>(ctx, "filePath", ""));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, cfg<string>(ctx, "content", ""), "utf8");
  return { output: { filePath } };
};
handlers["file.move"] = async (ctx) => {
  const from = safeResolve(ctx.storageDir, cfg<string>(ctx, "from", ""));
  const to = safeResolve(ctx.storageDir, cfg<string>(ctx, "to", ""));
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
  return { output: { to } };
};
handlers["file.rename"] = async (ctx) => {
  const filePath = safeResolve(ctx.storageDir, cfg<string>(ctx, "filePath", ""));
  const newName = cfg<string>(ctx, "newName", "");
  const to = path.join(path.dirname(filePath), newName);
  await fs.rename(filePath, to);
  return { output: { to } };
};
handlers["file.createDirectory"] = async (ctx) => {
  const dirPath = safeResolve(ctx.storageDir, cfg<string>(ctx, "path", ""));
  await fs.mkdir(dirPath, { recursive: true });
  return { output: { path: dirPath } };
};

function safeResolve(base: string, target: string): string {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error("Path traversal outside the storage directory is not allowed.");
  }
  return resolved;
}

/* -------- Utilities -------- */
handlers["utility.log"] = async (ctx) => {
  ctx.log(cfg(ctx, "level", "info"), cfg(ctx, "message", ""));
  return {};
};
handlers["utility.httpRequest"] = async (ctx) => {
  const method = cfg<string>(ctx, "method", "GET");
  const url = cfg<string>(ctx, "url", "");
  const headers = cfg<Record<string, string>>(ctx, "headers", {});
  const body = cfg<string>(ctx, "body", "");
  const res = await fetch(url, { method, headers, body: method === "GET" ? undefined : body });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep as text */ }
  const name = cfg<string>(ctx, "variableName", "httpResponse");
  ctx.setVariable(name, { status: res.status, body: parsed });
  return { output: { [name]: { status: res.status, body: parsed } } };
};

/* -------- Services (connector browser actions) -------- */
handlers["service.browserAction"] = async (ctx) => {
  // Connectors operate purely through the visible page using the same
  // interaction primitives as every other node; this handler simply logs
  // intent since the actual navigation/click/type nodes that make up a
  // connector action are separate nodes in the composed template.
  const connector = cfg<string>(ctx, "connector", "");
  const action = cfg<string>(ctx, "action", "");
  ctx.log("info", `Connector step: ${connector} / ${action}`);
  return {};
};
handlers["service.database"] = async () => {
  throw new Error(
    "Native database connectors are not enabled in this installation. Use a browser-based workflow against the database's web dashboard instead, or configure a database credential in Settings."
  );
};

export async function executeNode(nodeType: string, ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
  const handler = handlers[nodeType];
  if (!handler) {
    throw new Error(`No executor is registered for node type "${nodeType}". This action is not yet supported.`);
  }
  return handler(ctx);
}

export function isNodeTypeExecutable(nodeType: string): boolean {
  return nodeType in handlers;
}
