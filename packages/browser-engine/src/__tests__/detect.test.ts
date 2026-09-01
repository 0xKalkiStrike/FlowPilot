import { describe, it, expect } from "vitest";
import { classifyElement, type RawElementInfo } from "../detect.js";

function info(overrides: Partial<RawElementInfo>): RawElementInfo {
  return {
    tagName: "input", inputType: "", role: "", name: "", label: "", placeholder: "",
    ariaLabel: "", nearbyText: "", text: "", testId: "", css: "input", xpath: "//input",
    attributes: {}, ...overrides,
  };
}

describe("classifyElement", () => {
  it("classifies an email input by type", () => {
    expect(classifyElement(info({ inputType: "email" }))).toBe("form.email");
  });
  it("classifies an email input by hint when type is generic", () => {
    expect(classifyElement(info({ name: "user_email", label: "Email address" }))).toBe("form.email");
  });
  it("classifies a password input", () => {
    expect(classifyElement(info({ inputType: "password" }))).toBe("form.password");
  });
  it("classifies a select as dropdown", () => {
    expect(classifyElement(info({ tagName: "select" }))).toBe("form.dropdown");
  });
  it("classifies a checkbox", () => {
    expect(classifyElement(info({ inputType: "checkbox" }))).toBe("form.checkbox");
  });
  it("classifies a radio button", () => {
    expect(classifyElement(info({ inputType: "radio" }))).toBe("form.radio");
  });
  it("classifies a card number field by hint", () => {
    expect(classifyElement(info({ name: "cardNumber", label: "Card number" }))).toBe("form.cardNumber");
  });
  it("falls back to plain text input", () => {
    expect(classifyElement(info({ inputType: "text" }))).toBe("form.text");
  });
});
