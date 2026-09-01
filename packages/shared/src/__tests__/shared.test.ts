import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { encryptSecret, decryptSecret, hashPassword, verifyPassword } from "../encryption.js";
import { resolveTemplate, resolveDeep, extractVariableNames } from "../variables.js";
import { redact } from "../logger.js";

const KEY = crypto.randomBytes(32).toString("base64");

describe("credential encryption", () => {
  it("round-trips a secret", () => {
    const enc = encryptSecret("super-secret-value", KEY);
    expect(enc).not.toContain("super-secret-value");
    expect(decryptSecret(enc, KEY)).toBe("super-secret-value");
  });

  it("fails to decrypt with the wrong key", () => {
    const enc = encryptSecret("value", KEY);
    const otherKey = crypto.randomBytes(32).toString("base64");
    expect(() => decryptSecret(enc, otherKey)).toThrow();
  });

  it("hashes and verifies passwords without storing plaintext", () => {
    const { hash, salt } = hashPassword("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(verifyPassword("hunter2", hash, salt)).toBe(true);
    expect(verifyPassword("wrong", hash, salt)).toBe(false);
  });
});

describe("variable resolution", () => {
  it("resolves simple placeholders", () => {
    expect(resolveTemplate("Hello {{name}}", { name: "Ava" })).toBe("Hello Ava");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(resolveTemplate("Hello {{missing}}", {})).toBe("Hello {{missing}}");
  });

  it("resolves dotted paths", () => {
    expect(resolveTemplate("{{user.email}}", { user: { email: "a@b.com" } })).toBe("a@b.com");
  });

  it("resolves deep objects", () => {
    const out = resolveDeep({ url: "https://x.com/{{slug}}", nested: { q: "{{term}}" } }, { slug: "abc", term: "shoes" });
    expect(out).toEqual({ url: "https://x.com/abc", nested: { q: "shoes" } });
  });

  it("extracts variable names", () => {
    expect(extractVariableNames("{{a}} and {{b.c}}")).toEqual(["a", "b.c"]);
  });
});

describe("log redaction", () => {
  it("redacts sensitive keys", () => {
    const out = redact({ password: "x", nested: { token: "y" }, safe: "z" }) as any;
    expect(out.password).toBe("***REDACTED***");
    expect(out.nested.token).toBe("***REDACTED***");
    expect(out.safe).toBe("z");
  });
});
