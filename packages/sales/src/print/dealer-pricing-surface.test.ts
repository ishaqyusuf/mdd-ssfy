import { describe, expect, it } from "bun:test";
import { resolveDealerPrintPricingSurface } from "./dealer-pricing-surface";

describe("dealer print pricing surface", () => {
  it("uses customer-facing dealer pricing by default for dealer-owned sales", () => {
    const sale = resolveDealerPrintPricingSurface({
      dealerAuthId: 1,
      subTotal: 100,
      tax: 10,
      taxPercentage: 10,
      grandTotal: 110,
      amountDue: 110,
      dealerSale: {
        dealerSalesPercentage: 150,
        grandTotal: 275,
        dueAmount: 275,
      },
      items: [
        {
          qty: 2,
          rate: 50,
          total: 100,
          meta: {
            meta: {
              serviceRows: [{ qty: 2, unitPrice: 50, lineTotal: 100 }],
              mouldingRows: [{ qty: 2, salesPrice: 50, lineTotal: 100 }],
            },
          },
          shelfItems: [{ qty: 2, unitPrice: 50, totalPrice: 100 }],
          housePackageTool: {
            totalPrice: 100,
            doors: [
              { totalQty: 2, unitPrice: 25, lineTotal: 50 },
              { lhQty: 1, rhQty: 1, unitPrice: 25, lineTotal: 50 },
            ],
          },
        },
      ],
    });

    expect(sale.subTotal).toBe(250);
    expect(sale.tax).toBe(25);
    expect(sale.grandTotal).toBe(275);
    expect(sale.amountDue).toBe(275);
    expect(sale.items?.[0]?.rate).toBe(125);
    expect(sale.items?.[0]?.total).toBe(250);
    expect(sale.items?.[0]?.shelfItems?.[0]).toMatchObject({
      unitPrice: 125,
      totalPrice: 250,
    });
    expect(sale.items?.[0]?.housePackageTool?.doors?.[0]).toMatchObject({
      unitPrice: 62.5,
      lineTotal: 125,
    });
    expect(sale.items?.[0]?.housePackageTool?.doors?.[1]).toMatchObject({
      unitPrice: 62.5,
      lineTotal: 125,
    });
    expect(sale.items?.[0]?.meta.meta.serviceRows[0]).toMatchObject({
      unitPrice: 125,
      lineTotal: 250,
    });
    expect(sale.items?.[0]?.meta.meta.mouldingRows[0]).toMatchObject({
      salesPrice: 125,
      lineTotal: 250,
    });
  });

  it("keeps internal pricing when explicitly requested", () => {
    const input = {
      dealerAuthId: 1,
      subTotal: 100,
      tax: 10,
      taxPercentage: 10,
      grandTotal: 110,
      amountDue: 110,
      dealerSale: {
        dealerSalesPercentage: 150,
        grandTotal: 275,
        dueAmount: 275,
      },
      items: [
        {
          qty: 2,
          rate: 50,
          total: 100,
          meta: {},
          shelfItems: [{ qty: 2, unitPrice: 49, totalPrice: 98 }],
        },
      ],
    };

    const sale = resolveDealerPrintPricingSurface(input, "internal");

    expect(sale).not.toBe(input);
    expect(sale.grandTotal).toBe(110);
    expect(sale.items?.[0]?.rate).toBe(50);
    expect(sale.items?.[0]?.shelfItems?.[0]).toMatchObject({
      unitPrice: 50,
      totalPrice: 100,
    });
  });
});
