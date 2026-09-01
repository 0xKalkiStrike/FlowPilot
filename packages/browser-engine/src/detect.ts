/** Raw element info gathered by the in-page recorder script. */
export interface RawElementInfo {
  tagName: string;
  inputType?: string;
  role?: string;
  name?: string; // id or name attribute
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  nearbyText?: string;
  text?: string;
  testId?: string;
  css: string;
  xpath: string;
  attributes: Record<string, string>;
}

/**
 * Classifies a detected DOM element into the most specific FlowPilot node
 * type. Used by the recorder to turn raw browser events into form.* /
 * interaction.* nodes automatically (spec section 14).
 */
export function classifyElement(info: RawElementInfo): string {
  const tag = info.tagName.toLowerCase();
  const type = (info.inputType ?? "").toLowerCase();
  const hints = [info.name, info.label, info.placeholder, info.ariaLabel, info.nearbyText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (tag === "select") return "form.dropdown";
  if (tag === "textarea") return "form.textarea";
  if (type === "checkbox") return "form.checkbox";
  if (type === "radio") return "form.radio";
  if (type === "file") return "interaction.uploadFile";
  if (type === "email" || /\bemail\b/.test(hints)) return "form.email";
  if (type === "password" || /\bpassword\b/.test(hints)) return "form.password";
  if (type === "tel" || /\bphone\b|\bmobile\b/.test(hints)) return "form.phone";
  if (type === "number") return "form.number";
  if (type === "date") return "form.date";
  if (type === "time") return "form.time";
  if (type === "search" || /\bsearch\b/.test(hints)) return "form.search";
  if (/card.?number/.test(hints)) return "form.cardNumber";
  if (/\bcvv\b|\bcvc\b/.test(hints)) return "form.cvv";
  if (/expiry|exp.?date|expiration/.test(hints)) return "form.expiry";
  if (/name.?on.?card|cardholder/.test(hints)) return "form.nameOnCard";
  if (/postal|zip.?code/.test(hints)) return "form.postalCode";
  if (/\bcity\b/.test(hints)) return "form.city";
  if (/\bstate\b|\bprovince\b/.test(hints)) return "form.state";
  if (/\bcountry\b/.test(hints)) return "form.country";
  if (/\baddress\b/.test(hints)) return "form.address";
  if (tag === "input" && (type === "" || type === "text")) return "form.text";
  if (tag === "button" || info.role === "button" || tag === "a") return "interaction.click";
  return "interaction.click";
}

export function humanLabelFor(nodeType: string, info: RawElementInfo): string {
  const name = info.label || info.ariaLabel || info.text || info.placeholder || info.name || "element";
  const trimmed = name.length > 40 ? name.slice(0, 37) + "..." : name;
  switch (nodeType) {
    case "interaction.click":
      return `Click "${trimmed}"`;
    case "form.dropdown":
      return `Select "${trimmed}"`;
    case "form.checkbox":
      return `Checkbox "${trimmed}"`;
    case "form.radio":
      return `Radio "${trimmed}"`;
    default:
      return `${trimmed}`;
  }
}
