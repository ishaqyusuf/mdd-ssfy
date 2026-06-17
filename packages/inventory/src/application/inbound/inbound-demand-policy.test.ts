import { describe, expect, test } from "bun:test";

import {
  ACTIVE_INBOUND_DEMAND_STATUSES,
  ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES,
  canOrderInboundPromptMutateDemand,
  resolveOrderInboundDemandStatus,
} from "../../inbound-policy";

describe("inbound demand status policies", () => {
  test("defines the active demand statuses used by projection queries", () => {
    expect([...ACTIVE_INBOUND_DEMAND_STATUSES]).toEqual([
      "pending",
      "ordered",
      "partially_received",
    ]);
    expect(ACTIVE_INBOUND_DEMAND_STATUSES).not.toContain("cancelled");
  });

  test("defines the narrower demand statuses mutable from order prompts", () => {
    expect([...ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES]).toEqual([
      "pending",
      "ordered",
    ]);
    expect(ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES).not.toContain(
      "partially_received",
    );
  });
});

describe("resolveOrderInboundDemandStatus", () => {
  test("projects order prompts without downgrading received or linked demand", () => {
    expect(
      resolveOrderInboundDemandStatus({
        orderInventoryStatus: "ORDERED",
        qtyInbound: 3,
        qtyReceived: 0,
      }),
    ).toBe("ordered");

    expect(
      resolveOrderInboundDemandStatus({
        orderInventoryStatus: "PENDING ORDER",
        qtyInbound: 3,
        qtyReceived: 0,
      }),
    ).toBe("pending");

    expect(
      resolveOrderInboundDemandStatus({
        orderInventoryStatus: "PENDING ORDER",
        qtyInbound: 3,
        qtyReceived: 0,
        inboundShipmentItemId: 7,
      }),
    ).toBe("ordered");

    expect(
      resolveOrderInboundDemandStatus({
        orderInventoryStatus: "ORDERED",
        qtyInbound: 3,
        qtyReceived: 1,
      }),
    ).toBe("partially_received");

    expect(
      resolveOrderInboundDemandStatus({
        orderInventoryStatus: "PENDING ORDER",
        qtyInbound: 3,
        qtyReceived: 3,
      }),
    ).toBe("received");
  });
});

describe("canOrderInboundPromptMutateDemand", () => {
  test("allows selected available and ordered prompts to mutate open demand", () => {
    expect(
      canOrderInboundPromptMutateDemand({
        orderInventoryStatus: "AVAILABLE",
        demandStatus: "pending",
      }),
    ).toBe(true);
    expect(
      canOrderInboundPromptMutateDemand({
        orderInventoryStatus: "ORDERED",
        demandStatus: "ordered",
      }),
    ).toBe(true);
  });

  test("keeps pending-order prompts from downgrading shipment-linked demand", () => {
    expect(
      canOrderInboundPromptMutateDemand({
        orderInventoryStatus: "PENDING ORDER",
        demandStatus: "ordered",
        inboundShipmentItemId: 99,
      }),
    ).toBe(false);
    expect(
      canOrderInboundPromptMutateDemand({
        orderInventoryStatus: "PENDING ORDER",
        demandStatus: "ordered",
        inboundShipmentItemId: null,
      }),
    ).toBe(true);
  });

  test("protects non-prompt-mutable demand statuses", () => {
    for (const demandStatus of ["partially_received", "received", "cancelled"]) {
      expect(
        canOrderInboundPromptMutateDemand({
          orderInventoryStatus: "ORDERED",
          demandStatus,
        }),
      ).toBe(false);
    }
  });
});
