import { describe, expect, it } from "bun:test";
import { calculateSalesFormSummary } from "./sales-form";

describe("calculateNewSalesFormSummary", () => {
  it("matches current strategy summary behavior", () => {
    const result = calculateSalesFormSummary({
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
    const result = calculateSalesFormSummary({
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
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 10,
      paymentMethod: "Credit Card",
      cccPercentage: 3.5,
      lineItems: [{ qty: 1, unitPrice: 100 }],
      extraCosts: [],
    });

    expect(result.taxTotal).toBe(10);
    expect(result.ccc).toBe(3.85);
    expect(result.grandTotal).toBe(113.85);
  });

  it("excludes non-taxable custom costs from tax base", () => {
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 10,
      lineItems: [{ qty: 1, unitPrice: 100 }],
      extraCosts: [
        { type: "CustomTaxxable", amount: 20 },
        { type: "CustomNonTaxxable", amount: 30 },
      ],
    });

    expect(result.taxableSubTotal).toBe(120);
    expect(result.taxTotal).toBe(12);
    expect(result.grandTotal).toBe(162);
  });

  it("does not include flat labor in legacy credit-card surcharge base", () => {
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 0,
      paymentMethod: "Credit Card",
      cccPercentage: 3.5,
      lineItems: [{ qty: 1, unitPrice: 100 }],
      extraCosts: [
        { type: "Labor", amount: 10 },
        { type: "FlatLabor", amount: 20 },
      ],
    });

    expect(result.ccc).toBe(3.85);
    expect(result.grandTotal).toBe(133.85);
  });

  it("uses provided credit card percentage instead of a hardcoded default", () => {
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 0,
      paymentMethod: "Credit Card",
      cccPercentage: 5,
      lineItems: [{ qty: 1, unitPrice: 100 }],
      extraCosts: [],
    });

    expect(result.ccc).toBe(5);
    expect(result.grandTotal).toBe(105);
  });

  it("derives labor from grouped door rows when labor metadata exists", () => {
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 0,
      lineItems: [
        {
          qty: 1,
          unitPrice: 100,
          housePackageTool: {
            doors: [
              {
                totalQty: 3,
                meta: { unitLabor: 5 },
              },
            ],
          } as any,
        } as any,
      ],
      extraCosts: [{ type: "Labor", amount: 2 }],
    });

    expect(result.labor).toBe(15);
    expect(result.grandTotal).toBe(115);
  });

  it("derives labor from grouped service/moulding rows when metadata exists", () => {
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 0,
      lineItems: [
        {
          qty: 1,
          unitPrice: 100,
          meta: {
            serviceRows: [{ qty: 2, unitLabor: 3 }],
            mouldingRows: [{ qty: 1, meta: { unitLabor: 4 } }],
          },
        } as any,
      ],
      extraCosts: [{ type: "Labor", amount: 0 }],
    });

    expect(result.labor).toBe(10);
    expect(result.grandTotal).toBe(110);
  });

  it("excludes service lines from tax in legacy strategy by default", () => {
    const result = calculateSalesFormSummary({
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

  it("includes service line in tax base when service meta taxxable is true", () => {
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 10,
      lineItems: [
        {
          qty: 1,
          unitPrice: 100,
          meta: { taxxable: true },
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
    expect(result.taxableSubTotal).toBe(200);
    expect(result.taxTotal).toBe(20);
    expect(result.grandTotal).toBe(220);
  });

  it("respects explicit taxxable=false on non-service lines", () => {
    const result = calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 10,
      lineItems: [
        { qty: 1, unitPrice: 100, taxxable: false },
        { qty: 1, unitPrice: 100 },
      ],
    });

    expect(result.subTotal).toBe(200);
    expect(result.taxableSubTotal).toBe(100);
    expect(result.taxTotal).toBe(10);
    expect(result.grandTotal).toBe(210);
  });
});
