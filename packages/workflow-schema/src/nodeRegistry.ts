import { z } from "zod";

export type NodeCategory =
  | "triggers"
  | "browser"
  | "interaction"
  | "forms"
  | "logic"
  | "data"
  | "files"
  | "services"
  | "utilities";

export interface OutputPort {
  id: string;
  label: string;
}

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string; // lucide-react icon name
  configSchema: z.ZodTypeAny;
  defaultConfig: Record<string, unknown>;
  requiresTarget?: boolean;
  supportsCredential?: boolean;
  outputs?: OutputPort[]; // default single "out" port
  isContainer?: boolean; // loop/condition bodies nest children via parentId
  implemented: boolean; // false => validation blocks execution with a clear message
}

const text = (def = "") => z.string().default(def);
const num = (def = 0) => z.number().default(def);
const bool = (def = false) => z.boolean().default(def);

function node(def: NodeDefinition): NodeDefinition {
  return def;
}

export const NODE_REGISTRY: Record<string, NodeDefinition> = {};
function register(def: NodeDefinition) {
  NODE_REGISTRY[def.type] = def;
}

/* ---------------------------------- Triggers ---------------------------------- */

register(node({
  type: "trigger.manual", category: "triggers", label: "Manual Trigger",
  description: "Starts the workflow when a user clicks Run.", icon: "MousePointerClick",
  configSchema: z.object({}), defaultConfig: {}, implemented: true,
}));
register(node({
  type: "trigger.schedule", category: "triggers", label: "Schedule Trigger",
  description: "Starts the workflow on a recurring or one-time schedule.", icon: "Clock",
  configSchema: z.object({
    frequency: z.enum(["once", "daily", "weekly", "monthly", "interval", "weekdays", "custom"]).default("daily"),
    time: text("09:00"), timezone: text("Asia/Kolkata"),
    daysOfWeek: z.array(z.number()).default([]), dayOfMonth: num(1),
    intervalMinutes: num(60), cron: text(""), runOnceAt: text(""),
  }),
  defaultConfig: { frequency: "daily", time: "09:00", timezone: "Asia/Kolkata" }, implemented: true,
}));
register(node({
  type: "trigger.webhook", category: "triggers", label: "Webhook Trigger",
  description: "Starts the workflow when the workflow's webhook URL receives a POST request.", icon: "Webhook",
  configSchema: z.object({ path: text("") }), defaultConfig: {}, implemented: true,
}));
register(node({
  type: "trigger.workflow", category: "triggers", label: "Workflow Trigger",
  description: "Starts this workflow when another workflow calls it.", icon: "GitBranch",
  configSchema: z.object({ sourceWorkflowId: text("") }), defaultConfig: {}, implemented: true,
}));
register(node({
  type: "trigger.browser", category: "triggers", label: "Browser Trigger",
  description: "Starts the workflow from the browser recorder / extension action.", icon: "Chrome",
  configSchema: z.object({}), defaultConfig: {}, implemented: true,
}));

/* ---------------------------------- Browser ---------------------------------- */

register(node({ type: "browser.open", category: "browser", label: "Open URL", description: "Navigates to a URL.", icon: "Globe",
  configSchema: z.object({ url: text(""), waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).default("load") }),
  defaultConfig: { url: "", waitUntil: "load" }, implemented: true }));
register(node({ type: "browser.goBack", category: "browser", label: "Go Back", description: "Navigates back in history.", icon: "ArrowLeft",
  configSchema: z.object({}), defaultConfig: {}, implemented: true }));
register(node({ type: "browser.goForward", category: "browser", label: "Go Forward", description: "Navigates forward in history.", icon: "ArrowRight",
  configSchema: z.object({}), defaultConfig: {}, implemented: true }));
register(node({ type: "browser.reload", category: "browser", label: "Reload", description: "Reloads the current page.", icon: "RotateCw",
  configSchema: z.object({}), defaultConfig: {}, implemented: true }));
register(node({ type: "browser.newTab", category: "browser", label: "New Tab", description: "Opens a new browser tab.", icon: "SquarePlus",
  configSchema: z.object({ url: text("") }), defaultConfig: {}, implemented: true }));
register(node({ type: "browser.closeTab", category: "browser", label: "Close Tab", description: "Closes the current tab.", icon: "X",
  configSchema: z.object({}), defaultConfig: {}, implemented: true }));
register(node({ type: "browser.switchTab", category: "browser", label: "Switch Tab", description: "Switches to a tab by index.", icon: "SwitchCamera",
  configSchema: z.object({ index: num(0) }), defaultConfig: { index: 0 }, implemented: true }));
register(node({ type: "browser.wait", category: "browser", label: "Wait", description: "Pauses execution for a fixed duration.", icon: "Timer",
  configSchema: z.object({ durationMs: num(1000) }), defaultConfig: { durationMs: 1000 }, implemented: true }));
register(node({ type: "browser.waitForElement", category: "browser", label: "Wait For Element", description: "Waits until an element appears.", icon: "ScanSearch",
  configSchema: z.object({ state: z.enum(["visible", "attached", "hidden", "detached"]).default("visible") }),
  defaultConfig: { state: "visible" }, requiresTarget: true, implemented: true }));
register(node({ type: "browser.waitForNavigation", category: "browser", label: "Wait For Navigation", description: "Waits for the page to finish navigating.", icon: "Hourglass",
  configSchema: z.object({ waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).default("load") }), defaultConfig: {}, implemented: true }));
register(node({ type: "browser.scroll", category: "browser", label: "Scroll", description: "Scrolls the page by an offset or to top/bottom.", icon: "ArrowDownUp",
  configSchema: z.object({ direction: z.enum(["down", "up", "top", "bottom"]).default("down"), amountPx: num(600) }),
  defaultConfig: { direction: "down", amountPx: 600 }, implemented: true }));
register(node({ type: "browser.scrollToElement", category: "browser", label: "Scroll To Element", description: "Scrolls an element into view.", icon: "Locate",
  configSchema: z.object({}), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "browser.screenshot", category: "browser", label: "Screenshot", description: "Captures a screenshot of the page.", icon: "Camera",
  configSchema: z.object({ fullPage: bool(true) }), defaultConfig: { fullPage: true }, implemented: true }));
register(node({ type: "browser.pdf", category: "browser", label: "Save as PDF", description: "Saves the current page as a PDF.", icon: "FileText",
  configSchema: z.object({}), defaultConfig: {}, implemented: true }));
register(node({ type: "browser.setViewport", category: "browser", label: "Set Viewport", description: "Sets the browser viewport size.", icon: "Monitor",
  configSchema: z.object({ width: num(1366), height: num(900) }), defaultConfig: { width: 1366, height: 900 }, implemented: true }));
register(node({ type: "browser.cookie", category: "browser", label: "Browser Cookie", description: "Gets, sets, or clears cookies.", icon: "Cookie",
  configSchema: z.object({ action: z.enum(["get", "set", "clear"]).default("get"), name: text(""), value: text("") }),
  defaultConfig: { action: "get" }, implemented: true }));
register(node({ type: "browser.storage", category: "browser", label: "Browser Storage", description: "Gets or sets localStorage values.", icon: "Database",
  configSchema: z.object({ action: z.enum(["get", "set", "clear"]).default("get"), key: text(""), value: text("") }),
  defaultConfig: { action: "get" }, implemented: true }));

/* ---------------------------------- Interaction ---------------------------------- */

const clickConfig = z.object({ modifiers: z.array(z.enum(["Alt", "Control", "Meta", "Shift"])).default([]) });
register(node({ type: "interaction.click", category: "interaction", label: "Click", description: "Clicks an element.", icon: "MousePointer",
  configSchema: clickConfig, defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.doubleClick", category: "interaction", label: "Double Click", description: "Double-clicks an element.", icon: "MousePointerClick",
  configSchema: clickConfig, defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.rightClick", category: "interaction", label: "Right Click", description: "Right-clicks an element.", icon: "MousePointer2",
  configSchema: clickConfig, defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.hover", category: "interaction", label: "Hover", description: "Hovers over an element.", icon: "Pointer",
  configSchema: z.object({}), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.focus", category: "interaction", label: "Focus", description: "Focuses an element.", icon: "Focus",
  configSchema: z.object({}), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.blur", category: "interaction", label: "Blur", description: "Removes focus from an element.", icon: "FocusIcon" as any,
  configSchema: z.object({}), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.typeText", category: "interaction", label: "Type Text", description: "Types text into an element.", icon: "Keyboard",
  configSchema: z.object({ value: text(""), delayMs: num(20), clearFirst: bool(true) }),
  defaultConfig: { value: "", delayMs: 20, clearFirst: true }, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.clearField", category: "interaction", label: "Clear Field", description: "Clears the value of an input.", icon: "Eraser",
  configSchema: z.object({}), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.pressKey", category: "interaction", label: "Press Key", description: "Presses a keyboard key.", icon: "Keyboard",
  configSchema: z.object({ key: text("Enter") }), defaultConfig: { key: "Enter" }, implemented: true }));
register(node({ type: "interaction.pressEnter", category: "interaction", label: "Press Enter", description: "Presses the Enter key.", icon: "CornerDownLeft",
  configSchema: z.object({}), defaultConfig: {}, implemented: true }));
register(node({ type: "interaction.pressEscape", category: "interaction", label: "Press Escape", description: "Presses the Escape key.", icon: "CornerUpLeft",
  configSchema: z.object({}), defaultConfig: {}, implemented: true }));
register(node({ type: "interaction.dragAndDrop", category: "interaction", label: "Drag And Drop", description: "Drags an element onto another.", icon: "Move",
  configSchema: z.object({ targetSelectorCss: text("") }), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.uploadFile", category: "interaction", label: "Upload File", description: "Uploads a file via a file input.", icon: "Upload",
  configSchema: z.object({ filePath: text("") }), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "interaction.downloadFile", category: "interaction", label: "Download File", description: "Clicks an element and captures the resulting download.", icon: "Download",
  configSchema: z.object({}), defaultConfig: {}, requiresTarget: true, implemented: true }));

/* ---------------------------------- Forms ---------------------------------- */

function formField(type: string, label: string, icon: string, extra?: z.ZodRawShape) {
  register(node({
    type, category: "forms", label, description: `Fills a ${label} field.`, icon,
    configSchema: z.object({ value: text(""), ...(extra ?? {}) }),
    defaultConfig: { value: "" }, requiresTarget: true, implemented: true,
  }));
}
formField("form.email", "Email Input", "Mail");
formField("form.password", "Password Input", "Lock");
formField("form.text", "Text Input", "TextCursorInput");
formField("form.textarea", "Textarea", "AlignLeft");
formField("form.number", "Number Input", "Hash");
formField("form.phone", "Phone Input", "Phone");
formField("form.address", "Address Input", "MapPin");
formField("form.city", "City Input", "Building2");
formField("form.state", "State Input", "Map");
formField("form.country", "Country Input", "Flag");
formField("form.postalCode", "Postal Code Input", "Mailbox");
formField("form.date", "Date Input", "Calendar");
formField("form.time", "Time Input", "Clock3");
formField("form.search", "Search Input", "Search");
formField("form.cardNumber", "Card Number Field", "CreditCard");
formField("form.expiry", "Expiry Field", "CalendarClock");
formField("form.cvv", "CVV Field", "ShieldEllipsis" as any);
formField("form.nameOnCard", "Name On Card", "UserRound");
formField("form.billingAddress", "Billing Address", "Receipt");
formField("form.shippingAddress", "Shipping Address", "PackageCheck" as any);

register(node({ type: "form.checkbox", category: "forms", label: "Checkbox", description: "Checks or unchecks a checkbox.", icon: "CheckSquare",
  configSchema: z.object({ checked: bool(true) }), defaultConfig: { checked: true }, requiresTarget: true, implemented: true }));
register(node({ type: "form.radio", category: "forms", label: "Radio Button", description: "Selects a radio button.", icon: "CircleDot",
  configSchema: z.object({}), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "form.dropdown", category: "forms", label: "Dropdown", description: "Selects an option from a <select> or ARIA listbox.", icon: "ChevronDownSquare" as any,
  configSchema: z.object({ value: text(""), matchBy: z.enum(["label", "value"]).default("label") }),
  defaultConfig: { value: "", matchBy: "label" }, requiresTarget: true, implemented: true }));
register(node({ type: "form.multiSelect", category: "forms", label: "Multi Select", description: "Selects multiple options.", icon: "ListChecks",
  configSchema: z.object({ values: z.array(z.string()).default([]) }), defaultConfig: { values: [] }, requiresTarget: true, implemented: true }));
register(node({ type: "form.fileUpload", category: "forms", label: "File Upload", description: "Uploads a file into a form file field.", icon: "FileUp",
  configSchema: z.object({ filePath: text("") }), defaultConfig: {}, requiresTarget: true, implemented: true }));
register(node({ type: "form.quantity", category: "forms", label: "Set Quantity", description: "Sets a product quantity via input, stepper, or dropdown.", icon: "Plus",
  configSchema: z.object({
    desiredQuantity: num(1),
    strategy: z.enum(["auto", "input", "increment", "dropdown"]).default("auto"),
    incrementSelectorCss: text(""), decrementSelectorCss: text(""),
    min: num(1), max: num(999),
  }),
  defaultConfig: { desiredQuantity: 1, strategy: "auto", min: 1, max: 999 }, requiresTarget: true, implemented: true }));

/* ---------------------------------- Logic ---------------------------------- */

register(node({ type: "logic.if", category: "logic", label: "IF", description: "Branches based on a condition.", icon: "GitFork",
  configSchema: z.object({
    conditionType: z.enum(["elementExists", "elementVisible", "textContains", "textEquals", "valueEquals", "valueGreaterThan", "urlContains", "variableExists", "customExpression"]).default("elementExists"),
    expected: text(""), variableName: text(""),
  }),
  defaultConfig: { conditionType: "elementExists" }, outputs: [{ id: "true", label: "True" }, { id: "false", label: "False" }], isContainer: true, implemented: true }));
register(node({ type: "logic.switch", category: "logic", label: "SWITCH", description: "Branches into multiple cases based on a variable's value.", icon: "Split",
  configSchema: z.object({ variableName: text(""), cases: z.array(z.object({ value: z.string(), label: z.string() })).default([]) }),
  defaultConfig: { cases: [] }, outputs: [{ id: "default", label: "Default" }], isContainer: true, implemented: true }));
register(node({ type: "logic.loopRepeat", category: "logic", label: "Repeat N Times", description: "Repeats its child nodes a fixed number of times.", icon: "Repeat",
  configSchema: z.object({ times: num(3) }), defaultConfig: { times: 3 }, isContainer: true, outputs: [{ id: "loop", label: "Loop Body" }, { id: "done", label: "Done" }], implemented: true }));
register(node({ type: "logic.loopForEach", category: "logic", label: "For Each", description: "Repeats its child nodes once per item in a list variable.", icon: "ListTree",
  configSchema: z.object({ listVariableName: text(""), itemVariableName: text("item") }),
  defaultConfig: { itemVariableName: "item" }, isContainer: true, outputs: [{ id: "loop", label: "Loop Body" }, { id: "done", label: "Done" }], implemented: true }));
register(node({ type: "logic.loopWhile", category: "logic", label: "While", description: "Repeats its child nodes while a condition holds.", icon: "RefreshCw",
  configSchema: z.object({
    conditionType: z.enum(["elementExists", "elementVisible", "textContains", "variableExists", "customExpression"]).default("elementExists"),
    expected: text(""), variableName: text(""), maxIterations: num(50),
  }),
  defaultConfig: { conditionType: "elementExists", maxIterations: 50 }, isContainer: true, outputs: [{ id: "loop", label: "Loop Body" }, { id: "done", label: "Done" }], implemented: true }));
register(node({ type: "logic.loopUntil", category: "logic", label: "Loop Until", description: "Repeats its child nodes until a condition becomes true.", icon: "CircleDotDashed" as any,
  configSchema: z.object({
    conditionType: z.enum(["elementExists", "elementVisible", "textContains", "variableExists", "customExpression"]).default("elementExists"),
    expected: text(""), variableName: text(""), maxIterations: num(50),
  }),
  defaultConfig: { conditionType: "elementExists", maxIterations: 50 }, isContainer: true, outputs: [{ id: "loop", label: "Loop Body" }, { id: "done", label: "Done" }], implemented: true }));
register(node({ type: "logic.stop", category: "logic", label: "Stop Workflow", description: "Stops the workflow immediately.", icon: "OctagonX" as any,
  configSchema: z.object({ status: z.enum(["success", "failed"]).default("success"), message: text("") }), defaultConfig: { status: "success" }, implemented: true }));

/* ---------------------------------- Data ---------------------------------- */

register(node({ type: "data.setVariable", category: "data", label: "Set Variable", description: "Sets a workflow variable to a value or expression.", icon: "Variable" as any,
  configSchema: z.object({ name: text(""), value: text(""), operation: z.enum(["set", "increment", "decrement", "append"]).default("set") }),
  defaultConfig: { operation: "set" }, implemented: true }));
register(node({ type: "data.extractText", category: "data", label: "Extract Text", description: "Extracts text content from an element into a variable.", icon: "TextSelect" as any,
  configSchema: z.object({ variableName: text("extractedText") }), defaultConfig: { variableName: "extractedText" }, requiresTarget: true, implemented: true }));
register(node({ type: "data.extractAttribute", category: "data", label: "Extract Attribute", description: "Extracts an HTML attribute value into a variable.", icon: "Tag",
  configSchema: z.object({ attribute: text("href"), variableName: text("extractedAttribute") }),
  defaultConfig: { attribute: "href", variableName: "extractedAttribute" }, requiresTarget: true, implemented: true }));
register(node({ type: "data.extractValue", category: "data", label: "Extract Value", description: "Extracts an input's current value into a variable.", icon: "FormInput" as any,
  configSchema: z.object({ variableName: text("extractedValue") }), defaultConfig: { variableName: "extractedValue" }, requiresTarget: true, implemented: true }));
register(node({ type: "data.extractTable", category: "data", label: "Extract Table", description: "Extracts a table's headers and rows.", icon: "Table",
  configSchema: z.object({ variableName: text("tableData") }), defaultConfig: { variableName: "tableData" }, requiresTarget: true, implemented: true }));
register(node({ type: "data.extractLinks", category: "data", label: "Extract Links", description: "Extracts all links within an element or the page.", icon: "Link",
  configSchema: z.object({ variableName: text("links") }), defaultConfig: { variableName: "links" }, implemented: true }));
register(node({ type: "data.extractImages", category: "data", label: "Extract Images", description: "Extracts all image URLs within an element or the page.", icon: "Image",
  configSchema: z.object({ variableName: text("images") }), defaultConfig: { variableName: "images" }, implemented: true }));
register(node({ type: "data.extractUrl", category: "data", label: "Extract URL", description: "Extracts the current page URL into a variable.", icon: "Link2",
  configSchema: z.object({ variableName: text("currentUrl") }), defaultConfig: { variableName: "currentUrl" }, implemented: true }));
register(node({ type: "data.saveJson", category: "data", label: "Save JSON", description: "Saves a variable's value to a JSON file.", icon: "FileJson",
  configSchema: z.object({ variableName: text(""), fileName: text("output.json") }), defaultConfig: { fileName: "output.json" }, implemented: true }));
register(node({ type: "data.saveCsv", category: "data", label: "Save CSV", description: "Saves table/array data to a CSV file.", icon: "FileSpreadsheet",
  configSchema: z.object({ variableName: text(""), fileName: text("output.csv") }), defaultConfig: { fileName: "output.csv" }, implemented: true }));

/* ---------------------------------- Files ---------------------------------- */

register(node({ type: "file.readText", category: "files", label: "Read Text File", description: "Reads a text file into a variable.", icon: "FileText",
  configSchema: z.object({ filePath: text(""), variableName: text("fileContent") }), defaultConfig: { variableName: "fileContent" }, implemented: true }));
register(node({ type: "file.writeText", category: "files", label: "Write Text File", description: "Writes a value to a text file.", icon: "FilePlus",
  configSchema: z.object({ filePath: text(""), content: text("") }), defaultConfig: {}, implemented: true }));
register(node({ type: "file.move", category: "files", label: "Move File", description: "Moves a file to a new path.", icon: "FolderInput" as any,
  configSchema: z.object({ from: text(""), to: text("") }), defaultConfig: {}, implemented: true }));
register(node({ type: "file.rename", category: "files", label: "Rename File", description: "Renames a file.", icon: "FileSymlink" as any,
  configSchema: z.object({ filePath: text(""), newName: text("") }), defaultConfig: {}, implemented: true }));
register(node({ type: "file.createDirectory", category: "files", label: "Create Directory", description: "Creates a directory.", icon: "FolderPlus",
  configSchema: z.object({ path: text("") }), defaultConfig: {}, implemented: true }));

/* ---------------------------------- Services (connectors) ---------------------------------- */

register(node({ type: "service.browserAction", category: "services", label: "Connector Action", description: "Runs a browser-based action against a connected service (Discord, GitHub, WordPress, WooCommerce, Vercel, Render).", icon: "Plug",
  configSchema: z.object({ connector: z.enum(["discord", "github", "wordpress", "woocommerce", "vercel", "render", "email"]).default("discord"), action: text(""), params: z.record(z.string(), z.string()).default({}) }),
  defaultConfig: { connector: "discord", params: {} }, implemented: true }));
register(node({ type: "service.database", category: "services", label: "Database Query", description: "Runs a read query against a connected SQLite/PostgreSQL/MySQL database (optional native connector).", icon: "DatabaseZap" as any,
  configSchema: z.object({ query: text(""), variableName: text("queryResult") }), defaultConfig: { variableName: "queryResult" }, supportsCredential: true, implemented: true }));

/* ---------------------------------- Utilities ---------------------------------- */

register(node({ type: "utility.log", category: "utilities", label: "Log Message", description: "Writes a message to the execution log.", icon: "ScrollText" as any,
  configSchema: z.object({ message: text(""), level: z.enum(["debug", "info", "warn", "error"]).default("info") }),
  defaultConfig: { level: "info" }, implemented: true }));
register(node({ type: "utility.httpRequest", category: "utilities", label: "HTTP Request (Optional API)", description: "Makes an optional HTTP request. Not required for normal browser automation.", icon: "Send",
  configSchema: z.object({ method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"), url: text(""), headers: z.record(z.string(), z.string()).default({}), body: text(""), variableName: text("httpResponse") }),
  defaultConfig: { method: "GET", headers: {}, variableName: "httpResponse" }, implemented: true }));

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return NODE_REGISTRY[type];
}

export function listNodesByCategory(): Record<NodeCategory, NodeDefinition[]> {
  const result: Record<string, NodeDefinition[]> = {};
  for (const def of Object.values(NODE_REGISTRY)) {
    if (!result[def.category]) result[def.category] = [];
    result[def.category].push(def);
  }
  return result as Record<NodeCategory, NodeDefinition[]>;
}
