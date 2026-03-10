import { describe, expect, it } from "bun:test";
import { repriceSalesFormLineItemsByProfile } from "./profile-repricing";

describe("profile-repricing domain", () => {
  it("uses base prices when available for steps and selected components", () => {
    const lineItems = [
      {
        qty: 2,
        unitPrice: 100,
        lineTotal: 200,
        formSteps: [
          {
            price: 90,
            basePrice: 60,
            meta: {
              selectedComponents: [{ salesPrice: 40, basePrice: 20 }],
            },
          },
        ],
      },
    ];

    const result = repriceSalesFormLineItemsByProfile(lineItems, 2, 4);
    const line = result[0] as any;
    expect(line.formSteps[0].price).toBe(5);
    expect(line.formSteps[0].meta.selectedComponents[0].salesPrice).toBe(5);
    expect(line.unitPrice).toBe(5);
    expect(line.lineTotal).toBe(10);
  });

  it("falls back to ratio repricing when base prices are absent", () => {
    const lineItems = [
      {
        qty: 3,
        unitPrice: 60,
        lineTotal: 180,
        formSteps: [{ price: 60 }],
      },
    ];

    const result = repriceSalesFormLineItemsByProfile(lineItems, 2, 1);
    const line = result[0] as any;
    expect(line.formSteps[0].price).toBe(120);
    expect(line.unitPrice).toBe(120);
    expect(line.lineTotal).toBe(360);
  });

  it("reprices shelf and door rows and recomputes grouped totals", () => {
    const lineItems = [
      {
        qty: 1,
        unitPrice: 999,
        lineTotal: 999,
        shelfItems: [
          {
            qty: 2,
            unitPrice: 50,
            totalPrice: 100,
            meta: { baseUnitPrice: 40 },
          },
        ],
      },
      {
        qty: 1,
        unitPrice: 999,
        lineTotal: 999,
        housePackageTool: {
          totalDoors: 1,
          totalPrice: 999,
          doors: [
            {
              totalQty: 3,
              unitPrice: 200,
              lineTotal: 600,
              meta: { baseUnitPrice: 120 },
            },
          ],
        },
      },
    ];

    const result = repriceSalesFormLineItemsByProfile(lineItems, 2, 4);
    const shelfLine = result[0] as any;
    expect(shelfLine.shelfItems[0].unitPrice).toBe(10);
    expect(shelfLine.shelfItems[0].totalPrice).toBe(20);
    expect(shelfLine.lineTotal).toBe(20);
    expect(shelfLine.unitPrice).toBe(20);

    const doorLine = result[1] as any;
    expect(doorLine.housePackageTool.doors[0].unitPrice).toBe(30);
    expect(doorLine.housePackageTool.doors[0].lineTotal).toBe(90);
    expect(doorLine.housePackageTool.totalDoors).toBe(3);
    expect(doorLine.housePackageTool.totalPrice).toBe(90);
    expect(doorLine.qty).toBe(3);
    expect(doorLine.unitPrice).toBe(30);
    expect(doorLine.lineTotal).toBe(90);
  });

  it("uses legacy priceData baseUnitCost when present on grouped rows", () => {
    const lineItems = [
      {
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        shelfItems: [
          {
            qty: 2,
            unitPrice: 55,
            meta: { priceData: { baseUnitCost: 44 } },
          },
        ],
      },
      {
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        housePackageTool: {
          doors: [
            {
              totalQty: 2,
              unitPrice: 70,
              meta: { priceData: { baseUnitCost: 52 } },
            },
          ],
        },
      },
    ];

    const result = repriceSalesFormLineItemsByProfile(lineItems, 2, 4);
    const shelfLine = result[0] as any;
    expect(shelfLine.shelfItems[0].unitPrice).toBe(11);
    expect(shelfLine.shelfItems[0].totalPrice).toBe(22);

    const doorLine = result[1] as any;
    expect(doorLine.housePackageTool.doors[0].unitPrice).toBe(13);
    expect(doorLine.housePackageTool.doors[0].lineTotal).toBe(26);
  });
});
