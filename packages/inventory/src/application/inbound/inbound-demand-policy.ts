export const ACTIVE_INBOUND_DEMAND_STATUSES = [
  "pending",
  "ordered",
  "partially_received",
] as const;

export const ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES = [
  "pending",
  "ordered",
] as const;

export type OrderInboundStatus = "AVAILABLE" | "ORDERED" | "PENDING ORDER";

export type ResolveOrderInboundDemandStatusInput = {
  orderInventoryStatus?: string | null;
  qtyInbound: number;
  qtyReceived: number;
  inboundShipmentItemId?: number | null;
};

export type CanOrderInboundPromptMutateDemandInput = {
  orderInventoryStatus?: string | null;
  demandStatus?: string | null;
  inboundShipmentItemId?: number | null;
};

export function resolveOrderInboundDemandStatus(
  input: ResolveOrderInboundDemandStatusInput,
): "pending" | "ordered" | "partially_received" | "received" {
  const qtyInbound = Math.max(0, Number(input.qtyInbound || 0));
  const qtyReceived = Math.max(0, Number(input.qtyReceived || 0));

  if (qtyReceived > 0 && qtyReceived < qtyInbound) return "partially_received";
  if (qtyReceived >= qtyInbound && qtyInbound > 0) return "received";

  if (input.orderInventoryStatus === "ORDERED") return "ordered";
  if (input.orderInventoryStatus === "PENDING ORDER") {
    return input.inboundShipmentItemId ? "ordered" : "pending";
  }

  return "pending";
}

export function canOrderInboundPromptMutateDemand(
  input: CanOrderInboundPromptMutateDemandInput,
) {
  if (
    !ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES.includes(
      input.demandStatus as (typeof ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES)[number],
    )
  ) {
    return false;
  }

  if (input.orderInventoryStatus === "PENDING ORDER") {
    return !input.inboundShipmentItemId;
  }

  return (
    input.orderInventoryStatus === "AVAILABLE" ||
    input.orderInventoryStatus === "ORDERED"
  );
}
