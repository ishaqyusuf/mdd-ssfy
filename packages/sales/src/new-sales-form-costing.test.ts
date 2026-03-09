import { describe, expect, it } from "bun:test";
import { calculateNewSalesFormSummary } from "./new-sales-form-costing";

describe("calculateNewSalesFormSummary", () => {
  it("matches current strategy summary behavior", () => {
    const result = calculateNewSalesFormSummary({
      strategy: "current",
      taxRate: 10,
      lineItems: [
        { qty: 2, unitPrice: 100 },
        { qty: 1, unitPrice: 50 },
      ],
      extraCosts: [
        { type: "Discount", amount: 20 },
        { type: "Delivery", amount: 30 },
      ],
    });

    expect(result.subTotal).toBe(250);
    expect(result.adjustedSubTotal).toBe(260);
    expect(result.taxTotal).toBe(26);
    expect(result.grandTotal).toBe(286);
    expect(result.ccc).toBe(0);
  });

  it("applies percentage discount", () => {
    const result = calculateNewSalesFormSummary({
      strategy: "current",
      taxRate: 0,
      lineItems: [{ qty: 1, unitPrice: 200 }],
      extraCosts: [{ type: "DiscountPercentage", amount: 10 }],
    });

    expect(result.subTotal).toBe(200);
    expect(result.percentDiscountValue).toBe(20);
    expect(result.adjustedSubTotal).toBe(180);
    expect(result.grandTotal).toBe(180);
  });

  it("applies legacy credit card surcharge", () => {
    const result = calculateNewSalesFormSummary({
      strategy: "legacy",
      taxRate: 10,
      paymentMethod: "Credit Card",
      lineItems: [{ qty: 1, unitPrice: 100 }],
      extraCosts: [],
    });

    expect(result.taxTotal).toBe(10);
    expect(result.ccc).toBe(3.3);
    expect(result.grandTotal).toBe(113.3);
  });

  it("excludes service lines from tax in legacy strategy by default", () => {
    const result = calculateNewSalesFormSummary({
      strategy: "legacy",
      taxRate: 10,
      lineItems: [
        {
          qty: 1,
          unitPrice: 100,
          formSteps: [
            {
              step: { title: "Item Type" },
              value: "Services",
            },
          ],
        },
        { qty: 1, unitPrice: 100 },
      ],
    });

    expect(result.subTotal).toBe(200);
    expect(result.taxableSubTotal).toBe(100);
    expect(result.taxTotal).toBe(10);
    expect(result.grandTotal).toBe(210);
  });
});
