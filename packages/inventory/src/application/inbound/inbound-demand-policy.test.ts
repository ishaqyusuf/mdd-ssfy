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
        qtyReceived: 0,
      }),
    ).toBe(true);
    expect(
      canOrderInboundPromptMutateDemand({
        orderInventoryStatus: "ORDERED",
        demandStatus: "ordered",
        qtyReceived: 0,
      }),
    ).toBe(true);
  });

  test("protects shipment-linked demand for every prompt status", () => {
    for (const orderInventoryStatus of [
      "AVAILABLE",
      "ORDERED",
      "PENDING ORDER",
    ]) {
      expect(
        canOrderInboundPromptMutateDemand({
          orderInventoryStatus,
          demandStatus: "ordered",
          qtyReceived: 0,
          inboundShipmentItemId: 99,
        }),
      ).toBe(false);
    }

    expect(
      canOrderInboundPromptMutateDemand({
        orderInventoryStatus: "ORDERED",
        demandStatus: "ordered",
        qtyReceived: 0,
        inboundShipmentItemId: 0,
      }),
    ).toBe(false);
  });

  test("keeps pending-order prompts mutable for unassigned open demand", () => {
    expect(
      canOrderInboundPromptMutateDemand({
        orderInventoryStatus: "PENDING ORDER",
        demandStatus: "ordered",
        qtyReceived: 0,
        inboundShipmentItemId: null,
      }),
    ).toBe(true);
  });

  test("protects demand that has already received quantity", () => {
    for (const orderInventoryStatus of [
      "AVAILABLE",
      "ORDERED",
      "PENDING ORDER",
    ]) {
      expect(
        canOrderInboundPromptMutateDemand({
          orderInventoryStatus,
          demandStatus: "ordered",
          qtyReceived: 1,
          inboundShipmentItemId: null,
        }),
      ).toBe(false);
    }
  });

  test("protects non-prompt-mutable demand statuses", () => {
    for (const demandStatus of ["partially_received", "received", "cancelled"]) {
      expect(
        canOrderInboundPromptMutateDemand({
          orderInventoryStatus: "ORDERED",
          demandStatus,
          qtyReceived: 0,
        }),
      ).toBe(false);
    }
  });
});
