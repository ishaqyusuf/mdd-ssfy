import { describe, expect, it } from "bun:test";
import { shouldUpdateFloatingInvoiceAction } from "./floating-invoice-action-registry";

describe("floating invoice action host", () => {
  it("does not update when the action node and refresh key are unchanged", () => {
    const node = "button";
    expect(
      shouldUpdateFloatingInvoiceAction(
        { node, refreshKey: "lane:1" },
        { node, refreshKey: "lane:1" },
      ),
    ).toBe(false);
  });

  it("uses the refresh key instead of React node identity as the update boundary", () => {
    expect(
      shouldUpdateFloatingInvoiceAction(
        { node: "old-button", refreshKey: "lane:1" },
        { node: "new-button", refreshKey: "lane:1" },
      ),
    ).toBe(false);
  });

  it("updates when the refresh key changes", () => {
    const node = "button";
    expect(
      shouldUpdateFloatingInvoiceAction(
        { node, refreshKey: "lane:1" },
        { node, refreshKey: "lane:2" },
      ),
    ).toBe(true);
  });
});
