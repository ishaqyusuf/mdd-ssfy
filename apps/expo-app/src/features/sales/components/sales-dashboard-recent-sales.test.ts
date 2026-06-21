import { describe, expect, it } from "bun:test";
import {
  formatRecentSaleDate,
  toRecentSalesDocumentItem,
} from "./sales-dashboard-recent-sales";

describe("mobile sales dashboard recent sales helpers", () => {
  it("maps dashboard recent sales into sales document card rows", () => {
    expect(
      toRecentSalesDocumentItem({
        id: 7,
        orderId: "08499PC",
        customerName: "Acme Builders",
        customerPhone: "555-0100",
        total: 1250,
        due: 250,
        createdAt: "2026-06-19T12:00:00.000Z",
        deliveryOption: "pickup",
      }),
    ).toEqual({
      id: 7,
      orderId: "08499PC",
      displayName: "Acme Builders",
      customerPhone: "555-0100",
      deliveryOption: "pickup",
      salesDate: formatRecentSaleDate("2026-06-19T12:00:00.000Z"),
      invoice: {
        total: 1250,
        paid: 1000,
        pending: 250,
      },
    });
  });

  it("preserves explicit paid values from the dashboard payload", () => {
    expect(
      toRecentSalesDocumentItem({
        total: 1250,
        due: 300,
        paid: 800,
      }).invoice,
    ).toEqual({
      total: 1250,
      paid: 800,
      pending: 300,
    });
  });
});
