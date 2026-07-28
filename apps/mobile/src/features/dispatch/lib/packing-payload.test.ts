import { describe, expect, it } from "bun:test";
import { buildPackingPayload, hasQty } from "./packing-payload";

describe("buildPackingPayload", () => {
  it("builds packing lines for single-qty entries across deliverables", () => {
    const result = buildPackingPayload({
      salesItemId: 10,
      note: "mobile pack",
      enteredQty: { qty: 3 },
      deliverables: [
        { submissionId: 1001, qty: { qty: 2 } },
        { submissionId: 1002, qty: { qty: 2 } },
      ],
    });

    expect(result.packingLines).toEqual([
      { salesItemId: 10, submissionId: 1001, qty: { qty: 2 }, note: "mobile pack" },
      { salesItemId: 10, submissionId: 1002, qty: { qty: 1 }, note: "mobile pack" },
    ]);
    expect(result.remainder).toEqual({ qty: 0, lh: 0, rh: 0 });
  });

  it("builds packing lines for LR/RH entries", () => {
    const result = buildPackingPayload({
      salesItemId: 11,
      enteredQty: { lh: 2, rh: 3 },
      deliverables: [{ submissionId: 2001, qty: { lh: 5, rh: 5 } }],
    });

    expect(result.packingLines).toEqual([
      { salesItemId: 11, submissionId: 2001, qty: { lh: 2, rh: 3 }, note: undefined },
    ]);
    expect(hasQty(result.remainder)).toBe(false);
  });

  it("returns remainder when requested qty exceeds deliverables", () => {
    const result = buildPackingPayload({
      salesItemId: 12,
      enteredQty: { qty: 5 },
      deliverables: [{ submissionId: 3001, qty: { qty: 2 } }],
    });

    expect(result.packingLines).toEqual([
      { salesItemId: 12, submissionId: 3001, qty: { qty: 2 }, note: undefined },
    ]);
    expect(result.remainder).toEqual({ qty: 3, lh: 0, rh: 0 });
    expect(hasQty(result.remainder)).toBe(true);
  });
});
