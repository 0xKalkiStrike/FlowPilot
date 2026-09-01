import type { BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import type { WorkflowEdge, WorkflowNode } from "@flowpilot/workflow-schema";
import { classifyElement, humanLabelFor, type RawElementInfo } from "./detect.js";
import { ensureProfileDir } from "./profile.js";
import { resolveChromiumExecutablePath } from "./chromiumPath.js";

const BINDING_NAME = "__flowpilotRecordEvent";

type RawEvent =
  | { kind: "click"; info: RawElementInfo; url: string; timestamp: number }
  | { kind: "change"; info: RawElementInfo; value: string; url: string; timestamp: number }
  | { kind: "enter"; info: RawElementInfo; url: string; timestamp: number }
  | { kind: "navigate"; url: string; timestamp: number }
  | { kind: "download"; fileName: string; timestamp: number };

/**
 * The function below is serialized and run inside every page of the
 * recorded browser context (via context.addInitScript). It has no access to
 * the outer TypeScript scope — everything it needs is passed as arguments —
 * and communicates back to Node.js exclusively through the exposed binding.
 */
function installRecorderListeners(bindingName: string) {
  const w = window as any;
  function getRole(el: Element): string {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (tag === "button") return "button";
    if (tag === "a" && el.hasAttribute("href")) return "link";
    if (tag === "select") return "combobox";
    if (tag === "textarea") return "textbox";
    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "submit" || type === "button") return "button";
      return "textbox";
    }
    return "";
  }
  function getLabel(el: any): string {
    if (el.labels && el.labels.length) return el.labels[0].textContent.trim();
    const id = el.getAttribute("id");
    if (id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lbl) return (lbl.textContent || "").trim();
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return aria;
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const t = labelledby
        .split(" ")
        .map((id2: string) => document.getElementById(id2)?.textContent?.trim() ?? "")
        .join(" ")
        .trim();
      if (t) return t;
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return parentLabel.textContent.trim();
    return "";
  }
  function getTestId(el: Element): string {
    return (
      el.getAttribute("data-testid") ||
      el.getAttribute("data-test") ||
      el.getAttribute("data-qa") ||
      el.getAttribute("data-cy") ||
      ""
    );
  }
  function cssPath(el: Element): string {
    if ((el as HTMLElement).id) return "#" + CSS.escape((el as HTMLElement).id);
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 6) {
      let selector = node.tagName.toLowerCase();
      if ((node as HTMLElement).id) {
        parts.unshift("#" + CSS.escape((node as HTMLElement).id));
        break;
      }
      const parent: Element | null = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
        if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(selector);
      node = parent;
      depth++;
    }
    return parts.join(" > ");
  }
  function xpathFor(el: Element): string {
    if ((el as HTMLElement).id) return `//*[@id="${(el as HTMLElement).id}"]`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1) {
      let index = 1;
      let sib = node.previousElementSibling;
      while (sib) {
        if (sib.tagName === node.tagName) index++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(`${node.tagName.toLowerCase()}[${index}]`);
      node = node.parentElement;
    }
    return "/" + parts.join("/");
  }
  function nearbyText(el: Element): string {
    const prev = el.previousElementSibling;
    if (prev && prev.textContent) return prev.textContent.trim().slice(0, 60);
    const parent = el.parentElement;
    if (parent) {
      const t = Array.from(parent.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => (n.textContent || "").trim())
        .join(" ")
        .trim();
      if (t) return t.slice(0, 60);
    }
    return "";
  }
  function stableAttributes(el: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    ["name", "id", "placeholder", "type", "aria-label"].forEach((a) => {
      const v = el.getAttribute(a);
      if (v) attrs[a] = v;
    });
    return attrs;
  }
  function describe(el: Element) {
    return {
      tagName: el.tagName.toLowerCase(),
      inputType: el.getAttribute("type") || "",
      role: getRole(el),
      name: el.getAttribute("name") || el.getAttribute("id") || "",
      label: getLabel(el),
      placeholder: el.getAttribute("placeholder") || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      nearbyText: nearbyText(el),
      text: (el.textContent || "").trim().slice(0, 80),
      testId: getTestId(el),
      css: cssPath(el),
      xpath: xpathFor(el),
      attributes: stableAttributes(el),
    };
  }

  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      const target = e.target as Element | null;
      const el = target?.closest?.(
        "a, button, [role=button], input[type=submit], input[type=button], input[type=checkbox], input[type=radio], li, td, [onclick]"
      );
      if (!el) return;
      w[bindingName]({ kind: "click", info: describe(el), url: location.href, timestamp: Date.now() });
    },
    true
  );

  document.addEventListener(
    "change",
    (e: Event) => {
      const el = e.target as any;
      if (!el || !el.tagName) return;
      const tag = el.tagName.toLowerCase();
      if (!["input", "select", "textarea"].includes(tag)) return;
      const type = (el.getAttribute("type") || "").toLowerCase();
      let value = "";
      if (tag === "select") value = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value;
      else if (type === "checkbox" || type === "radio") value = el.checked ? "true" : "false";
      else if (type === "password") value = "";
      else value = el.value;
      w[bindingName]({ kind: "change", info: describe(el), value, url: location.href, timestamp: Date.now() });
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      const el = e.target as any;
      if (e.key === "Enter" && el?.tagName && ["input", "textarea"].includes(el.tagName.toLowerCase())) {
        w[bindingName]({ kind: "enter", info: describe(el), url: location.href, timestamp: Date.now() });
      }
    },
    true
  );
}

export interface RecorderStatus {
  currentUrl: string;
  lastAction: string;
  eventCount: number;
  paused: boolean;
}

export class RecorderSession {
  private events: RawEvent[] = [];
  private paused = false;
  private lastClickIndex = -1;

  private constructor(private context: BrowserContext, private page: Page) {}

  static async start(opts: { profilesBaseDir: string; profileId: string; startUrl?: string }): Promise<RecorderSession> {
    const dir = await ensureProfileDir(opts.profilesBaseDir, opts.profileId);
    const context = await chromium.launchPersistentContext(dir, {
      headless: false,
      executablePath: resolveChromiumExecutablePath(),
      viewport: { width: 1366, height: 900 },
      acceptDownloads: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const page = context.pages()[0] ?? (await context.newPage());
    const session = new RecorderSession(context, page);

    await context.exposeBinding(BINDING_NAME, (_source, payload: RawEvent) => session.handleEvent(payload));
    await context.addInitScript(installRecorderListeners, BINDING_NAME);

    context.on("page", (p) => session.attachPage(p));
    session.attachPage(page);

    if (opts.startUrl) {
      await page.goto(opts.startUrl);
    }
    return session;
  }

  private attachPage(page: Page) {
    let lastUrl = "";
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      const url = frame.url();
      if (url === lastUrl || url === "about:blank") return;
      lastUrl = url;
      this.handleEvent({ kind: "navigate", url, timestamp: Date.now() });
    });
    page.on("download", async (download) => {
      this.handleEvent({ kind: "download", fileName: download.suggestedFilename(), timestamp: Date.now() });
    });
  }

  private handleEvent(event: RawEvent) {
    if (this.paused) return;
    if (event.kind === "navigate") {
      const recent = this.events[this.events.length - 1];
      if (recent && recent.timestamp > event.timestamp - 1500 && (recent.kind === "click" || recent.kind === "enter")) {
        return; // navigation was almost certainly caused by the click/enter we already recorded
      }
    }
    if (event.kind === "download") {
      if (this.lastClickIndex >= 0 && Date.now() - this.events[this.lastClickIndex].timestamp < 4000) {
        (this.events[this.lastClickIndex] as any).__isDownloadTrigger = true;
        return;
      }
    }
    this.events.push(event);
    if (event.kind === "click") this.lastClickIndex = this.events.length - 1;
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  undoLast() { this.events.pop(); }

  getStatus(): RecorderStatus {
    const last = this.events[this.events.length - 1];
    return {
      currentUrl: this.page.url(),
      lastAction: last ? describeRawEvent(last) : "No actions recorded yet",
      eventCount: this.events.length,
      paused: this.paused,
    };
  }

  async stop(): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
    const result = eventsToWorkflow(this.events);
    await this.context.close();
    return result;
  }
}

function describeRawEvent(event: RawEvent): string {
  switch (event.kind) {
    case "click": return `Clicked "${event.info.text || event.info.label || event.info.name || "element"}"`;
    case "change": return `Filled "${event.info.label || event.info.name || "field"}"`;
    case "enter": return "Pressed Enter";
    case "navigate": return `Navigated to ${event.url}`;
    case "download": return `Downloaded ${event.fileName}`;
  }
}

function targetFromInfo(info: RawElementInfo) {
  const accessibleName = info.label || info.ariaLabel || (info.text && info.text.length < 60 ? info.text : "");
  return {
    testId: info.testId || undefined,
    role: info.role || undefined,
    name: accessibleName || undefined,
    label: info.label || undefined,
    text: info.text || undefined,
    placeholder: info.placeholder || undefined,
    css: info.css,
    xpath: info.xpath,
    attributes: Object.keys(info.attributes).length ? info.attributes : undefined,
    tagName: info.tagName,
  };
}

function eventsToWorkflow(events: RawEvent[]): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let y = 80;
  let index = 0;

  function push(node: Omit<WorkflowNode, "position">) {
    const id = node.id;
    nodes.push({ ...node, position: { x: 320, y } } as WorkflowNode);
    if (nodes.length > 1) {
      edges.push({ id: `e_${nodes[nodes.length - 2].id}_${id}`, source: nodes[nodes.length - 2].id, target: id });
    }
    y += 140;
    index++;
  }

  for (const event of events) {
    if (event.kind === "navigate") {
      push({ id: `rec_${index}`, type: "browser.open", label: `Open ${safeHost(event.url)}`, config: { url: event.url } });
    } else if (event.kind === "click") {
      const isDownload = (event as any).__isDownloadTrigger;
      const nodeType = isDownload ? "interaction.downloadFile" : "interaction.click";
      push({
        id: `rec_${index}`,
        type: nodeType,
        label: humanLabelFor("interaction.click", event.info),
        config: {},
        target: targetFromInfo(event.info),
      });
    } else if (event.kind === "change") {
      const nodeType = classifyElement(event.info);
      const sensitive = nodeType === "form.password";
      push({
        id: `rec_${index}`,
        type: nodeType,
        label: humanLabelFor(nodeType, event.info),
        config: sensitive ? { value: "" } : { value: event.value, matchBy: "label" },
        target: targetFromInfo(event.info),
        metadata: sensitive
          ? { sensitive: true, note: "Password values are never recorded. Attach a credential or set this field's value before running." }
          : undefined,
      });
    } else if (event.kind === "enter") {
      push({ id: `rec_${index}`, type: "interaction.pressEnter", label: "Press Enter", config: {}, target: targetFromInfo(event.info) });
    }
  }

  return { nodes, edges };
}

function safeHost(url: string): string {
  try {
    const host = new URL(url).host;
    return host || url;
  } catch {
    return url;
  }
}
