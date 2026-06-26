import { describe, expect, it } from "bun:test";

import { salesOrderDto, salesQuoteDto } from "./sales-dto";

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
  it("includes repaired credit card fee before invoice total", () => {
    const dto = salesQuoteDto(
      makeSale({
        grandTotal: 110,
        amountDue: 110,
        meta: {
          ccc: 3.85,
          ccc_percentage: 3.5,
          payment_option: "Credit Card",
        },
      }),
    );

    expect(dto.costLines).toEqual([
      { label: "Sub total", amount: 100 },
      { label: "Tax", amount: 10 },
      { label: "Credit Card Fee (3.5%)", amount: 3.85 },
      { label: "Total Invoice", amount: 110 },
      { label: "Paid", amount: 0 },
      { label: "Due Amount", amount: 110 },
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

  it("splits unpaid selected-card due from calculated ccc total", () => {
    const dto = salesOrderDto(
      makeSale({
        type: "order",
        grandTotal: 1621.05,
        amountDue: 1621.05,
        subTotal: 1515,
        taxes: [{ tax: 106.05, taxConfig: { title: "Tax" } }],
        meta: {
          newSalesForm: {
            form: {
              paymentMethod: "Credit Card",
            },
          },
          ccc_percentage: 3,
          ccc: 1,
        },
        payments: [],
      }),
    );

    expect(dto.costLines).toEqual([
      { label: "Sub total", amount: 1515 },
      { label: "Tax", amount: 106.05 },
      { label: "Order Due Amount", amount: 1621.05 },
      { label: "C.C.C", amount: 48.63 },
      { label: "Total Due With C.C.C", amount: 1669.68 },
    ]);
  });

  it("labels full card payment total as charged to card", () => {
    const dto = salesOrderDto(
      makeSale({
        type: "order",
        grandTotal: 846.67,
        amountDue: 0,
        subTotal: 825,
        taxes: [{ tax: 55.39, taxConfig: { title: "County & State Tax" } }],
        extraCosts: [{ label: "Discount", totalAmount: -33.72 }],
        meta: {
          payment_option: "Credit Card",
          ccc_percentage: 3,
        },
        payments: [
          {
            amount: 846.67,
            status: "success",
            deletedAt: null,
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            meta: {
              salesAmount: 846.67,
              feeAmount: 25.4,
              customerChargeAmount: 872.07,
              paymentCharges: [
                {
                  type: "ccc",
                  label: "C.C.C",
                  baseAmount: 846.67,
                  percentage: 3,
                  amount: 25.4,
                },
              ],
            },
            transaction: { meta: null, paymentMethod: "credit-card" },
            squarePayments: null,
          },
        ],
      }),
    );

    expect(dto.costLines).toEqual([
      { label: "Sub total", amount: 825 },
      { label: "Discount", amount: -33.72 },
      { label: "County & State Tax", amount: 55.39 },
      { label: "C.C.C", amount: 25.4 },
      { label: "Charged to Card", amount: 872.07 },
      { label: "Total Due", amount: 0 },
    ]);
  });

  it("separates recorded card ccc in partial mixed overview lines", () => {
    const dto = salesOrderDto(
      makeSale({
        type: "order",
        grandTotal: 5000,
        amountDue: 1500,
        subTotal: 5000,
        taxes: [],
        meta: {
          payment_option: "Credit Card",
          ccc_percentage: 3.5,
        },
        payments: [
          {
            amount: 2500,
            status: "success",
            deletedAt: null,
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            meta: {
              salesAmount: 2500,
              feeAmount: 87.5,
              customerChargeAmount: 2587.5,
              paymentCharges: [
                {
                  type: "ccc",
                  label: "C.C.C",
                  baseAmount: 2500,
                  percentage: 3.5,
                  amount: 87.5,
                },
              ],
            },
            transaction: { meta: null, paymentMethod: "credit-card" },
            squarePayments: null,
          },
          {
            amount: 1000,
            status: "success",
            deletedAt: null,
            createdAt: new Date("2026-06-24T13:00:00.000Z"),
            meta: {},
            transaction: { meta: null, paymentMethod: "cash" },
            squarePayments: null,
          },
        ],
      }),
    );

    expect(dto.costLines).toEqual([
      { label: "Sub total", amount: 5000 },
      { label: "Order Total", amount: 5000 },
      { label: "Paid Toward Order", amount: 3500 },
      { label: "Card Payment", amount: 2500 },
      { label: "C.C.C on Card Payment", amount: 87.5 },
      { label: "Charged to Card", amount: 2587.5 },
      { label: "Balance Due", amount: 1500 },
    ]);
  });

  it("does not infer unrecorded partial card ccc", () => {
    const dto = salesOrderDto(
      makeSale({
        type: "order",
        grandTotal: 5000,
        amountDue: 2500,
        subTotal: 5000,
        taxes: [],
        meta: {
          payment_option: "Credit Card",
          ccc_percentage: 3.5,
          ccc: 175,
        },
        payments: [
          {
            amount: 2500,
            status: "success",
            deletedAt: null,
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            meta: {},
            transaction: { meta: null, paymentMethod: "credit-card" },
            squarePayments: null,
          },
        ],
      }),
    );

    expect(dto.costLines).toEqual([
      { label: "Sub total", amount: 5000 },
      { label: "Order Total", amount: 5000 },
      { label: "Paid Toward Order", amount: 2500 },
      { label: "Balance Due", amount: 2500 },
    ]);
  });
});
