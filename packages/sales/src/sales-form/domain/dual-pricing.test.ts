import { describe, expect, it } from "bun:test";
import {
  buildDualSalesFormPricingSnapshot,
  calculateDualSalesFormPricing,
} from "./dual-pricing";

describe("dual sales form pricing", () => {
  it("keeps internal and dealer percentage totals separate", () => {
    const result = calculateDualSalesFormPricing({
      taxRate: 10,
      internalProfile: {
        id: 1,
        coefficient: 0.67,
      },
      dealerProfile: {
        id: 2,
        coefficient: 99,
        salesPercentage: 20,
      },
      lineItems: [
        {
          uid: "line-1",
          title: "Door",
          qty: 2,
          unitPrice: 100,
          taxxable: true,
        },
      ],
    });

    expect(result.internalProfileId).toBe(1);
    expect(result.dealerProfileId).toBe(2);
    expect(result.lines[0]).toMatchObject({
      internalUnitPrice: 149,
      internalLineTotal: 298,
      dealerUnitPrice: 178.8,
      dealerLineTotal: 357.6,
    });
    expect(result.internalPricing.grandTotal).toBe(327.8);
    expect(result.dealerPricing.grandTotal).toBe(393.36);
  });

  it("falls back to coefficient 1 for missing profiles", () => {
    const result = calculateDualSalesFormPricing({
      lineItems: [
        {
          uid: "line-1",
          qty: 1,
          unitPrice: 42,
        },
      ],
    });

    expect(result.lines[0]?.internalLineTotal).toBe(42);
    expect(result.lines[0]?.dealerLineTotal).toBe(42);
  });

  it("builds an explicit reusable snapshot with internal coefficient and dealer percentage", () => {
    const snapshot = buildDualSalesFormPricingSnapshot({
      createdAt: "2026-05-18T00:00:00.000Z",
      internalProfile: {
        id: 10,
        label: "Standard",
        coefficient: 0.67,
      },
      dealerProfile: {
        id: 20,
        label: "Retail",
        coefficient: 99,
        salesPercentage: 20,
      },
      lineItems: [
        {
          uid: "line-1",
          title: "Shelf",
          qty: 2,
          unitPrice: 25,
        },
      ],
    });

    expect(snapshot.source).toBe("sales_form_dual_pricing");
    expect(snapshot.createdAt).toBe("2026-05-18T00:00:00.000Z");
    expect(snapshot.profiles.internal).toEqual({
      id: 10,
      label: "Standard",
      coefficient: 0.67,
    });
    expect(snapshot.profiles.dealer).toEqual({
      id: 20,
      label: "Retail",
      coefficient: 99,
      salesPercentage: 20,
    });
    expect(snapshot.internalPricing.grandTotal).toBe(74.5);
    expect(snapshot.dealerPricing.grandTotal).toBe(89.4);
  });
});
