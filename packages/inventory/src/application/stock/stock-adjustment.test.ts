import { describe, expect, test } from "bun:test";

import {
  buildStockAuditVerificationReport,
  getStockAuditExpectation,
  planStockAdjustment,
  STOCK_AUDIT_MATRIX,
} from "./stock-adjustment";

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

describe("stock audit expectations", () => {
  test("defines required audit coverage categories", () => {
    expect(STOCK_AUDIT_MATRIX.map((row) => row.category)).toEqual([
      "stock_in",
      "stock_out",
      "return",
      "correction",
      "consume",
      "release",
    ]);
  });

  test("maps stock adjustment reasons to movement and log actions", () => {
    expect(getStockAuditExpectation("stock_in", 5)).toEqual({
      movementType: "stock_in",
      logAction: "stock-in",
    });
    expect(getStockAuditExpectation("stock_out", -5)).toEqual({
      movementType: "stock_out",
      logAction: "stock-out",
    });
    expect(getStockAuditExpectation("return", 2)).toEqual({
      movementType: "return",
      logAction: "return",
    });
    expect(getStockAuditExpectation("correction", -2)).toEqual({
      movementType: "adjustment",
      logAction: "correction-out",
    });
    expect(getStockAuditExpectation("consume", -1)).toEqual({
      movementType: "sale",
      logAction: "consume",
    });
    expect(getStockAuditExpectation("release", 1)).toEqual({
      movementType: "return",
      logAction: "release",
    });
  });

  test("verifies movement and log evidence for required categories", () => {
    const report = buildStockAuditVerificationReport({
      movements: [
        { type: "stock_in", changeQty: 5 },
        { type: "stock_out", changeQty: -3 },
        { type: "return", changeQty: 2 },
        { type: "adjustment", changeQty: -1 },
        { type: "sale", changeQty: -4 },
      ],
      logs: [
        { action: "stock-in", qty: 5 },
        { action: "stock-out", qty: 3 },
        { action: "return", qty: 2 },
        { action: "correction-out", qty: 1 },
        { action: "consume", qty: 4 },
      ],
    });

    expect(report.summary).toMatchObject({
      totalCategories: 6,
      verifiedCategories: 5,
      partialCategories: 0,
      notObservedCategories: 1,
    });
    expect(report.rows.find((row) => row.category === "release")).toMatchObject({
      status: "not_observed",
      movementCount: 0,
      logCount: 0,
    });
  });
});
