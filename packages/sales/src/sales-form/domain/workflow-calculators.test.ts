import { describe, expect, it } from "bun:test";
import {
  deriveMouldingRows,
  deriveServiceRows,
  getRouteConfigForLine,
  resolveDoorTierPricing,
  resolvePricingBucketUnitPrice,
  resolveSizeFromPricingKey,
  summarizeDoors,
  summarizeMouldingPersistRows,
  summarizeShelfRows,
  summarizeServiceRows,
} from "./workflow-calculators";

describe("workflow-calculators domain", () => {
  it("parses supplier-dependent size keys", () => {
    expect(resolveSizeFromPricingKey("2-8 x 7-0 & SUP1", "SUP1")).toBe("2-8 x 7-0");
  });

  it("summarizes door rows", () => {
    const out = summarizeDoors([{ lhQty: 1, rhQty: 2, unitPrice: 100 }]);
    expect(out.totalDoors).toBe(3);
    expect(out.totalPrice).toBe(300);
  });

  it("uses totalQty when noHandle route config is active", () => {
    const out = summarizeDoors(
      [{ lhQty: 1, rhQty: 2, totalQty: 4, unitPrice: 50 }],
      { noHandle: true },
    );
    expect(out.rows[0].lhQty).toBe(0);
    expect(out.rows[0].rhQty).toBe(0);
    expect(out.rows[0].totalQty).toBe(4);
    expect(out.totalPrice).toBe(200);
  });

  it("clears swing values when hasSwing is disabled", () => {
    const out = summarizeDoors([{ lhQty: 1, rhQty: 0, unitPrice: 50, swing: "LH" }], {
      hasSwing: false,
    });
    expect(out.rows[0].swing).toBe("");
  });

  it("merges route config and overrides", () => {
    const config = getRouteConfigForLine({
      routeData: { composedRouter: { root1: { config: { noHandle: false } } } },
      line: { formSteps: [{ prodUid: "root1" }] },
      step: { meta: { sectionOverride: { overrideMode: true, noHandle: true } } },
    });
    expect(config.noHandle).toBe(true);
  });

  it("applies override precedence as base -> component -> step", () => {
    const config = getRouteConfigForLine({
      routeData: {
        composedRouter: {
          root1: { config: { noHandle: false, hasSwing: false } },
        },
      },
      line: { formSteps: [{ prodUid: "root1" }] },
      component: {
        sectionOverride: { overrideMode: true, noHandle: true, hasSwing: false },
      },
      step: {
        meta: {
          sectionOverride: { overrideMode: true, noHandle: false, hasSwing: true },
        },
      },
    });
    expect(config.noHandle).toBe(false);
    expect(config.hasSwing).toBe(true);
  });

  it("applies persisted prior-step overrides before current step/component", () => {
    const config = getRouteConfigForLine({
      routeData: {
        composedRouter: {
          root1: { config: { noHandle: false, hasSwing: false } },
        },
      },
      line: {
        formSteps: [
          {
            prodUid: "root1",
          },
          {
            meta: {
              sectionOverride: {
                overrideMode: true,
                noHandle: true,
                hasSwing: true,
              },
            },
          },
        ],
      },
      step: {
        meta: {
          sectionOverride: {
            overrideMode: true,
            noHandle: false,
          },
        },
      },
    });
    expect(config.noHandle).toBe(false);
    expect(config.hasSwing).toBe(true);
  });

  it("derives and summarizes service rows", () => {
    const rows = deriveServiceRows({
      lineUid: "l1",
      existingRows: [],
      lineDescription: "Install",
      lineQty: 2,
      lineUnitPrice: 10,
      lineTaxxable: true,
    });
    const summary = summarizeServiceRows("l1", rows);
    expect(summary.qtyTotal).toBe(2);
    expect(summary.lineTotal).toBe(20);
    expect(summary.taxxable).toBe(true);
  });

  it("summarizes empty service rows to zero state", () => {
    const summary = summarizeServiceRows("l1", []);
    expect(summary.rows).toEqual([]);
    expect(summary.qtyTotal).toBe(0);
    expect(summary.lineTotal).toBe(0);
    expect(summary.unitPrice).toBe(0);
    expect(summary.taxxable).toBe(false);
    expect(summary.description).toBe("");
  });

  it("summarizes shelf rows", () => {
    const summary = summarizeShelfRows([
      { qty: 2, unitPrice: 10 },
      { qty: 1, unitPrice: 5.5 },
    ]);
    expect(summary.qtyTotal).toBe(3);
    expect(summary.lineTotal).toBe(25.5);
    expect(summary.unitPrice).toBe(8.5);
  });

  it("derives and summarizes moulding rows", () => {
    const rows = deriveMouldingRows({
      selectedMouldings: [{ uid: "m1", title: "Casing", salesPrice: 20, basePrice: 10 }],
      existingRows: [],
      sharedComponentPrice: 5,
    });
    const summary = summarizeMouldingPersistRows(rows, 5);
    expect(summary.qtyTotal).toBe(1);
    expect(summary.total).toBe(25);
  });

  it("resolves HPT unit price from supplier/size pricing buckets", () => {
    const unit = resolvePricingBucketUnitPrice({
      pricing: {
        "2-8 x 7-0 & SUP-1": { salesUnitCost: 155 },
      },
      size: "2-8 x 7-0",
      supplierUid: "SUP-1",
      fallbackSalesPrice: 99,
    });
    expect(unit).toBe(155);
  });

  it("keeps explicit zero pricing buckets instead of falling back", () => {
    const unit = resolvePricingBucketUnitPrice({
      pricing: {
        "2-8 x 7-0 & SUP-1": { salesUnitCost: 0, baseUnitCost: 45 },
      },
      size: "2-8 x 7-0",
      supplierUid: "SUP-1",
      fallbackSalesPrice: 99,
    });
    expect(unit).toBe(0);
  });

  it("derives door tier sales price from base tier price and sales multiplier", () => {
    const pricing = resolveDoorTierPricing({
      pricing: {
        "2-8 x 7-0 & SUP-1": { price: 120 },
      },
      size: "2-8 x 7-0",
      supplierUid: "SUP-1",
      salesMultiplier: 0.25,
      fallbackSalesPrice: 99,
      fallbackBasePrice: 88,
    });
    expect(pricing.hasPrice).toBe(true);
    expect(pricing.basePrice).toBe(120);
    expect(pricing.salesPrice).toBe(30);
  });

  it("treats missing supplier-specific door pricing as empty instead of falling back", () => {
    const pricing = resolveDoorTierPricing({
      pricing: {
        "2-8 x 7-0": { price: 120 },
      },
      size: "2-8 x 7-0",
      supplierUid: "SUP-1",
      salesMultiplier: 1.54,
      fallbackSalesPrice: 99,
      fallbackBasePrice: 88,
    });
    expect(pricing.hasPrice).toBe(false);
    expect(pricing.basePrice).toBe(0);
    expect(pricing.salesPrice).toBe(0);
  });
});
