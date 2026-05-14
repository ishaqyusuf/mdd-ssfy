import { describe, expect, it } from "bun:test";

import { salesQuoteDto } from "./sales-dto";

function makeSale(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderId: "12345AB",
    slug: "12345ab",
    type: "quote",
    createdAt: new Date("2026-05-14T00:00:00.000Z"),
    updatedAt: new Date("2026-05-14T00:00:00.000Z"),
    meta: {},
    productionGate: null,
    grandTotal: 113.85,
    amountDue: 113.85,
    subTotal: 100,
    extraCosts: [],
    taxes: [{ tax: 10, taxConfig: { title: "Tax" } }],
    stat: [],
    customer: null,
    billingAddress: null,
    shippingAddress: null,
    salesRep: null,
    isDyke: false,
    paymentTerm: null,
    paymentDueDate: null,
    deliveryOption: null,
    shippingAddressId: null,
    ...overrides,
  } as any;
}

describe("sales dto cost lines", () => {
  it("includes persisted credit card fee before invoice total", () => {
    const dto = salesQuoteDto(
      makeSale({
        meta: {
          ccc: 3.85,
          ccc_percentage: 3.5,
        },
      }),
    );

    expect(dto.costLines).toEqual([
      { label: "Sub total", amount: 100 },
      { label: "Tax", amount: 10 },
      { label: "Credit Card Fee (3.5%)", amount: 3.85 },
      { label: "Total Invoice", amount: 113.85 },
      { label: "Paid", amount: 0 },
      { label: "Due Amount", amount: 113.85 },
    ]);
  });

  it("omits credit card fee line when no fee is persisted", () => {
    const dto = salesQuoteDto(makeSale());

    expect(dto.costLines.map((line) => line.label)).toEqual([
      "Sub total",
      "Tax",
      "Total Invoice",
      "Paid",
      "Due Amount",
    ]);
  });
});
