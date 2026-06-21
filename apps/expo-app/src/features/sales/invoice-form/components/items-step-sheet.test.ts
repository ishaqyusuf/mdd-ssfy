import { describe, expect, it } from "bun:test";
import {
  getInvoiceItemSheetIndexLabel,
  getInvoiceItemSheetSummary,
  getInvoiceItemsSheetSnapPoints,
} from "./items-step-sheet";
import type { InvoiceItemSection } from "./items-step-sections";

describe("items step sheet helpers", () => {
  it("sizes the sheet from the item count", () => {
    expect(getInvoiceItemsSheetSnapPoints(1)).toEqual(["32%"]);
    expect(getInvoiceItemsSheetSnapPoints(3)).toEqual(["49%"]);
    expect(getInvoiceItemsSheetSnapPoints(4)).toEqual(["58%"]);
    expect(getInvoiceItemsSheetSnapPoints(10)).toEqual(["92%"]);
  });

  it("formats compact breadcrumb labels and item summaries", () => {
    expect(getInvoiceItemSheetIndexLabel(0)).toBe("Item 01");
    expect(
      getInvoiceItemSheetSummary({
        key: "one",
        title: "Door",
        lines: [{ uid: "line-1" } as any, { uid: "line-2" } as any],
        qty: 3,
        total: 120,
        hasWorkflow: true,
      } satisfies InvoiceItemSection),
    ).toBe("Qty 3 • 2 lines • $120.00");
  });
});
