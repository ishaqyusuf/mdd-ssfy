export const inboundFilterStatus = [
  "total",
  "pending",
  "complete",
  "missing items",
  "back order",
] as const;
export type InboundFilterStatus = (typeof inboundFilterStatus)[number];
export const noteTagNames = [
  "itemControlUID",
  "deliveryId",
  "salesId",
  "salesItemId",
  "salesAssignment",
  "inboundStatus",
  "status",
  "type",
  "attachment",
] as const;
export type NoteTagNames = (typeof noteTagNames)[number];
export const noteTypes = [
  "email",
  "general",
  "payment",
  "production",
  "dispatch",
  "inbound",
] as const;
export type NoteTagTypes = (typeof noteTypes)[number];
export const noteStatus = ["public", "private"] as const;
export type NoteTagStatus = (typeof noteStatus)[number];

export const salesDeliveryMode = ["pickup", "delivery"] as const;
export const salesType = ["order", "quote"] as const;

export const salesDispatchStatus = [
  "queue",
  "in progress",
  "completed",
  "cancelled",
] as const;
export type SalesDispatchStatus = (typeof salesDispatchStatus)[number];
