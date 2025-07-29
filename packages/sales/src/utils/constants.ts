export const SALES_DISPATCH_STATUS = [
  "queue",
  "missing items",
  "in progress",
  "completed",
  "cancelled",
] as const;
export type SalesDispatchStatus = (typeof SALES_DISPATCH_STATUS)[number];

export const DISPATCH_ITEM_PACKING_STATUS = ["packed", "unpacked"] as const;
