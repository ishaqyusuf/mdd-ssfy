import { describe, expect, it } from "bun:test";
import { normalizeInvoiceItemDescription } from "./items-step-copy";

describe("items step copy", () => {
  it("keeps human invoice item descriptions", () => {
    expect(normalizeInvoiceItemDescription("Door package")).toBe("Door package");
  });

  it("hides placeholder and uid-like workflow descriptions", () => {
    expect(normalizeInvoiceItemDescription("WF-ITEM")).toBe("");
    expect(normalizeInvoiceItemDescription("workflow-door-package")).toBe("");
    expect(normalizeInvoiceItemDescription("mobile-moulding-style")).toBe("");
    expect(normalizeInvoiceItemDescription("componentUid:abc")).toBe("");
  });
});
