import { describe, expect, it } from "bun:test";
import {
  buildShelfSections,
  deriveDoorSizeCandidates,
  deriveMouldingRows,
  deriveServiceRows,
  flattenShelfSections,
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

  it("applies addon and custom override in door summaries", () => {
    const out = summarizeDoors([
      { totalQty: 2, unitPrice: 100, addon: 15 },
      { totalQty: 1, unitPrice: 50, addon: 5, customPrice: 77.25 },
    ]);
    expect(out.rows[0].lineTotal).toBe(215);
    expect(out.rows[1].lineTotal).toBe(77.25);
    expect(out.totalPrice).toBe(292.25);
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

  it("lets the active component override beat persisted prior-step override state", () => {
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
      component: {
        sectionOverride: {
          overrideMode: true,
          noHandle: false,
          hasSwing: false,
        },
      },
      step: {},
    });
    expect(config.noHandle).toBe(false);
    expect(config.hasSwing).toBe(false);
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

  it("groups flat shelf rows into old-form-style sections", () => {
    const sections = buildShelfSections([
      {
        categoryId: 20,
        productId: 101,
        description: "Panel",
        qty: 2,
        unitPrice: 15,
        meta: {
          sectionUid: "sec-a",
          shelfParentCategoryId: 10,
          productRowUid: "row-a",
        },
      },
      {
        categoryId: 20,
        productId: 102,
        description: "Trim",
        qty: 1,
        unitPrice: 5,
        meta: {
          sectionUid: "sec-a",
          shelfParentCategoryId: 10,
          productRowUid: "row-b",
        },
      },
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].uid).toBe("sec-a");
    expect(sections[0].categoryIds).toEqual([]);
    expect(sections[0].parentCategoryId).toBe(10);
    expect(sections[0].categoryId).toBe(20);
    expect(sections[0].rows).toHaveLength(2);
    expect(sections[0].subTotal).toBe(35);
  });

  it("flattens shelf sections while preserving base/sales/custom pricing metadata", () => {
    const rows = flattenShelfSections(
      [
        {
          uid: "sec-a",
          categoryIds: [10, 20],
          parentCategoryId: 10,
          categoryId: 20,
          rows: [
            {
              uid: "row-a",
              productId: 101,
              description: "Panel",
              qty: 2,
              meta: {
                basePrice: 10,
                customPrice: 18,
              },
            },
          ],
        },
      ],
      0.65,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].unitPrice).toBe(18);
    expect(rows[0].totalPrice).toBe(36);
    expect(rows[0].meta.sectionUid).toBe("sec-a");
    expect(rows[0].meta.categoryIds).toEqual([10, 20]);
    expect(rows[0].meta.shelfParentCategoryId).toBe(10);
    expect(rows[0].meta.basePrice).toBe(10);
    expect(rows[0].meta.salesPrice).toBe(15.4);
    expect(rows[0].meta.customPrice).toBe(18);
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

  it("returns zero when supplier-specific pricing has not been normalized to supplier variants", () => {
    const unit = resolvePricingBucketUnitPrice({
      pricing: {
        "2-8 x 7-0 & SUP-1": { salesUnitCost: 155 },
      },
      size: "2-8 x 7-0",
      supplierUid: "SUP-1",
      fallbackSalesPrice: 99,
    });
    expect(unit).toBe(0);
  });

  it("prefers supplier-variant pricing over legacy pricing buckets when available", () => {
    const unit = resolvePricingBucketUnitPrice({
      pricing: {
        "2-8 x 7-0 & SUP-1": { salesUnitCost: 155 },
      },
      size: "2-8 x 7-0",
      supplierUid: "SUP-1",
      supplierVariants: [
        {
          salesPrice: 199,
          costPrice: 120,
          supplier: { uid: "SUP-1" },
          active: true,
        },
      ],
      fallbackSalesPrice: 99,
    });
    expect(unit).toBe(199);
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

  it("returns no door tier price when supplier-specific pricing has not been normalized to supplier variants", () => {
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
    expect(pricing.hasPrice).toBe(false);
    expect(pricing.basePrice).toBe(0);
    expect(pricing.salesPrice).toBe(0);
  });

  it("derives door tier pricing from supplier-variant cost when present", () => {
    const pricing = resolveDoorTierPricing({
      pricing: {
        "2-8 x 7-0 & SUP-1": { price: 120 },
      },
      size: "2-8 x 7-0",
      supplierUid: "SUP-1",
      supplierVariants: [
        {
          costPrice: 80,
          salesPrice: null,
          supplier: { uid: "SUP-1" },
          active: true,
        },
      ],
      salesMultiplier: 0.25,
      fallbackSalesPrice: 99,
      fallbackBasePrice: 88,
    });
    expect(pricing.hasPrice).toBe(true);
    expect(pricing.basePrice).toBe(80);
    expect(pricing.salesPrice).toBe(20);
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

  it("uses matching variant widths as the canonical door-size list when configured", () => {
    const sizes = deriveDoorSizeCandidates(
      {
        formSteps: [
          {
            step: { uid: "height-step", title: "Height" },
            value: "6-8",
            prodUid: "h-68",
          },
          {
            step: { uid: "casing-step", title: "Casing Y/N" },
            prodUid: "no-casing",
          },
          {
            step: { uid: "door-step", title: "Door" },
            meta: {
              doorSizeVariation: [
                {
                  rules: [
                    {
                      stepUid: "casing-step",
                      operator: "is",
                      componentsUid: ["no-casing"],
                    },
                  ],
                  widthList: ["1-4", "1-8"],
                },
              ],
            },
          },
        ],
      },
      {
        "2-0 x 6-8": { price: 50 },
      },
    );

    expect(sizes).toEqual(["1-4 x 6-8", "1-8 x 6-8"]);
  });

  it("does not let persisted or priced sizes expand the canonical list when variants exist", () => {
    const sizes = deriveDoorSizeCandidates(
      {
        housePackageTool: {
          doors: [{ dimension: "1-10 x 6-8" }],
        },
        formSteps: [
          {
            step: { uid: "height-step", title: "Height" },
            value: "6-8",
            prodUid: "h-68",
          },
          {
            step: { uid: "casing-step", title: "Casing Y/N" },
            prodUid: "no-casing",
          },
          {
            step: { uid: "door-step", title: "Door" },
            meta: {
              doorSizeVariation: [
                {
                  rules: [
                    {
                      stepUid: "casing-step",
                      operator: "is",
                      componentsUid: ["no-casing"],
                    },
                  ],
                  widthList: ["1-4"],
                },
              ],
            },
          },
        ],
      },
      {
        "2-0 x 6-8": { price: 50 },
      },
    );

    expect(sizes).toEqual(["1-4 x 6-8"]);
  });

  it("ignores non-matching door size variants", () => {
    const sizes = deriveDoorSizeCandidates(
      {
        formSteps: [
          {
            step: { uid: "height-step", title: "Height" },
            value: "8-0",
            prodUid: "h-80",
          },
          {
            step: { uid: "casing-step", title: "Casing Y/N" },
            prodUid: "yes-casing",
          },
          {
            step: { uid: "door-step", title: "Door" },
            meta: {
              doorSizeVariation: [
                {
                  rules: [
                    {
                      stepUid: "casing-step",
                      operator: "is",
                      componentsUid: ["no-casing"],
                    },
                  ],
                  widthList: ["1-10"],
                },
              ],
            },
          },
        ],
      },
      {
        "2-0 x 8-0": { price: 50 },
      },
    );

    expect(sizes).toEqual([]);
  });

  it("falls back to configured route step variants when line step meta is empty", () => {
    const sizes = deriveDoorSizeCandidates(
      {
        formSteps: [
          {
            step: { uid: "height-step", title: "Height" },
            value: "6-8",
            prodUid: "h-68",
          },
          {
            step: { uid: "casing-step", title: "Casing Y/N" },
            prodUid: "no-casing",
          },
          {
            step: { uid: "door-step", title: "Door" },
            meta: {},
          },
        ],
      },
      {
        "2-0 x 6-8": { price: 50 },
      },
      {
        stepsByUid: {
          "door-step": {
            meta: {
              doorSizeVariation: [
                {
                  rules: [
                    {
                      stepUid: "casing-step",
                      operator: "is",
                      componentsUid: ["no-casing"],
                    },
                  ],
                  widthList: ["1-10"],
                },
              ],
            },
          },
        },
      },
    );

    expect(sizes).toEqual(["1-10 x 6-8"]);
  });

  it("falls back to pricing-derived sizes when no variant configuration exists", () => {
    const sizes = deriveDoorSizeCandidates(
      {
        formSteps: [
          {
            step: { uid: "height-step", title: "Height" },
            value: "6-8",
            prodUid: "h-68",
          },
        ],
      },
      {
        "1-10 x 6-8": { price: 40 },
        "2-0 x 6-8 & SUP-1": { price: 50 },
      },
    );

    expect(sizes).toEqual(["1-10 x 6-8", "2-0 x 6-8"]);
  });
});
