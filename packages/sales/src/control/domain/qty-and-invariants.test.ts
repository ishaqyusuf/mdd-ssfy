import { describe, expect, it } from "bun:test";
import { assertNonNegativeQty, assertPackedNotGreaterThanAvailable } from "./invariants";
import { diffQtyStat, emptyQtyStat, sumQtyStat, toQtyStat } from "./qty";

describe("control domain qty", () => {
  it("normalizes null/negative values and derives total", () => {
    const stat = toQtyStat({
      lhQty: -1 as any,
      rhQty: 2,
      qty: 0,
      total: null,
    });

    expect(stat).toEqual({
      lhQty: 0,
      rhQty: 2,
      qty: 0,
      total: 2,
    });
  });

  it("sums qty stats", () => {
    const total = sumQtyStat(
      toQtyStat({ lhQty: 1, rhQty: 2, qty: 3, total: 3 }),
      toQtyStat({ lhQty: 2, rhQty: 1, qty: 3, total: 3 }),
    );

    expect(total).toEqual({
      lhQty: 3,
      rhQty: 3,
      qty: 6,
      total: 6,
    });
  });

  it("diffs qty stats without going negative", () => {
    const result = diffQtyStat(
      toQtyStat({ lhQty: 2, rhQty: 3, qty: 5, total: 5 }),
      toQtyStat({ lhQty: 10, rhQty: 1, qty: 2, total: 2 }),
    );

    expect(result).toEqual({
      lhQty: 0,
      rhQty: 2,
      qty: 3,
      total: 3,
    });
  });

  it("returns zeroed empty qty stat", () => {
    expect(emptyQtyStat()).toEqual({
      lhQty: 0,
      rhQty: 0,
      qty: 0,
      total: 0,
    });
  });
});

describe("control domain invariants", () => {
  it("rejects negative quantities", () => {
    expect(() =>
      assertNonNegativeQty("packed", {
        lhQty: -1,
        rhQty: 0,
        qty: 0,
        total: 0,
      }),
    ).toThrow("must not be negative");
  });

  it("rejects packing above available quantities", () => {
    expect(() =>
      assertPackedNotGreaterThanAvailable(
        { lhQty: 1, rhQty: 2, qty: 3, total: 3 },
        { lhQty: 1, rhQty: 1, qty: 2, total: 2 },
      ),
    ).toThrow("exceeds available quantity");
  });

  it("accepts valid packed quantities", () => {
    expect(() =>
      assertPackedNotGreaterThanAvailable(
        { lhQty: 1, rhQty: 1, qty: 2, total: 2 },
        { lhQty: 3, rhQty: 2, qty: 5, total: 5 },
      ),
    ).not.toThrow();
  });
});
