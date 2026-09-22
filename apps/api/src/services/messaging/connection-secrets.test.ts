import { describe, expect, it } from "bun:test";
import {
  createConnectionCode,
  createExtensionCredential,
  hashConnectionCode,
  hashExtensionCredential,
} from "./connection-secrets";

describe("Marketplace connection secrets", () => {
  const serverSecret = "a-private-server-side-pepper-that-is-not-stored-in-chrome";

  it("issues twelve-digit codes and stores a keyed digest instead of the code", () => {
    const code = createConnectionCode();
    expect(code).toMatch(/^\d{12}$/);
    const hash = hashConnectionCode(code, serverSecret);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(code);
    expect(hashConnectionCode(code, `${serverSecret}-different`)).not.toBe(hash);
    expect(() => hashConnectionCode("123", serverSecret)).toThrow();
  });

  it("issues an independent high-entropy credential with a stable lookup digest", () => {
    const credential = createExtensionCredential();
    const other = createExtensionCredential();
    expect(credential).toMatch(/^gnd_msg_[A-Za-z0-9_-]{43}$/);
    expect(hashExtensionCredential(credential)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashExtensionCredential(credential)).not.toBe(hashExtensionCredential(other));
    expect(() => hashExtensionCredential("web-session-cookie")).toThrow();
  });
});
