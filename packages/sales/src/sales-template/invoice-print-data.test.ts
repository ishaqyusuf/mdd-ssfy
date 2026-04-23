import { describe, expect, it } from "bun:test";
import { getInvoicePrintData } from "./invoice-print-data";

describe("getInvoicePrintData", () => {
  it("prints a fallback row for garage items saved without persisted door rows", async () => {
    const db = {
      salesOrders: {
        findMany: async () => [
          {
            id: 1,
            orderId: "02988PC",
            type: "order",
            isDyke: true,
            createdAt: new Date("2026-04-22T10:00:00.000Z"),
            amountDue: 0,
            grandTotal: 250,
            meta: {},
            goodUntil: null,
            paymentTerm: null,
            customer: {
              name: "Test Customer",
              businessName: "Test Customer",
              phoneNo: null,
              email: null,
              address: null,
            },
            billingAddress: null,
            shippingAddress: null,
            salesRep: { name: "Rep" },
            deliveries: [],
            items: [
              {
                id: 10,
                qty: 1,
                rate: 250,
                total: 250,
                swing: "LH",
                description: "Garage",
                dykeDescription: "Garage",
                meta: {
                  lineIndex: 1,
                  doorType: "Garage",
                },
                formSteps: [
                  {
                    step: { title: "Item Type" },
                    value: "Garage",
                    prodUid: "garage-root",
                    component: null,
                  },
                ],
                shelfItems: [],
                multiDyke: false,
                multiDykeUid: null,
                housePackageTool: {
                  doorType: "Garage",
                  stepProduct: {
                    name: "Garage Door",
                    door: { title: "Garage Door" },
                    product: { title: "Garage Door" },
                  },
                  doors: [],
                },
              },
            ],
          },
        ],
      },
      settings: {
        findFirst: async () => null,
      },
    } as any;

    const [printData] = await getInvoicePrintData(db, {
      ids: [1],
      mode: "invoice",
      access: "internal",
      type: "order",
      dispatchId: null,
    });

    expect(printData?.linesSection).toHaveLength(1);
    expect(printData?.linesSection[0]?.tableRows).toHaveLength(1);
    expect(printData?.linesSection[0]?.tableRows[0]?.Door?.text?.[0]).toBe(
      "Garage",
    );
    expect(printData?.linesSection[0]?.tableRows[0]?.Qty?.text?.[0]).toBe(1);
  });
});
