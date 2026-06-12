import { describe, expect, test } from "bun:test";

import { planStockAdjustment } from "./stock-adjustment";

describe("planStockAdjustment", () => {
  test("applies delta adjustments from the previous quantity", () => {
    expect(
      planStockAdjustment({
        previousQty: 10,
        qty: -3,
      }),
    ).toEqual({
      previousQty: 10,
      currentQty: 7,
      changeQty: -3,
    });
  });

  test("sets stock to an absolute counted quantity", () => {
    expect(
      planStockAdjustment({
        previousQty: 10,
        qty: 14,
        mode: "set",
      }),
    ).toEqual({
      previousQty: 10,
      currentQty: 14,
      changeQty: 4,
    });
  });

  test("rejects negative final stock", () => {
    expect(() =>
      planStockAdjustment({
        previousQty: 2,
        qty: -3,
      }),
    ).toThrow("Stock adjustment cannot reduce stock below zero.");
  });
});
