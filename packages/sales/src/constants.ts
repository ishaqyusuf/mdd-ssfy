export type SalesResolutionConflictType = (typeof conflictType)[number];
export const conflictType = [
  "duplicate payments",
  "payment not up to date",
  "overpayment",
  "resolved",
  "no conflict",
] as const;

export const SALES_PAYMENT_STATUS = [
  "created",
  "pending",
  "success",
  "cancelled",
] as const;

export type SalesPaymentStatus = (typeof SALES_PAYMENT_STATUS)[number];

export const CUSTOMER_TRANSACTION_STATUS = [
  "draft",
  "success",
  "cancelled",
] as const;
export type CustomerTransanctionStatus =
  (typeof CUSTOMER_TRANSACTION_STATUS)[number];

export const INVOICE_PRINT_MODES = [
  // "customer",
  "invoice",
  "packing slip",
  "quote",
  "production",
] as const;

export const SALES_DELIVERY_OPTION_LIST = ["delivery", "pickup"] as const;
export type SalesDeliveryOptionList =
  (typeof SALES_DELIVERY_OPTION_LIST)[number];
export const SALES_PAYMENT_METHODS = [
  "link",
  "terminal",
  "check",
  "cash",
  "zelle",
  "credit-card",
  "wire",
  "wallet",
] as const;
export type SalesPaymentMethods = (typeof SALES_PAYMENT_METHODS)[number];
export const SALES_PAYMENT_METHOD_OPTIONS: {
  label?: string;
  value?: SalesPaymentMethods;
}[] = [
  { label: "Terminal Payment", value: "terminal" },
  { label: "Check", value: "check" },
  { label: "Payment Link", value: "link" },
  { label: "Wire Transfer", value: "wire" },
  { label: "Credit Card", value: "credit-card" },
  { label: "Zelle", value: "zelle" },
  { label: "Cash", value: "cash" },
];
export const SALES_DELIVERY_OPTIONS: {
  label: string;
  value: SalesDeliveryOptionList;
}[] = [
  { label: "Delivery", value: "delivery" },
  { label: "Pickup", value: "pickup" },
];

export const SALES_PAYMENT_CANCELLATION_REASONS = [
  "refund-wallet",
  "duplicate",
  "customer-repay",
  "no-reason",
  "fraud",
  "error",
] as const;

export const SALES_REFUND_METHODS = [
  ...SALES_PAYMENT_METHODS,
  // "wallet",
] as const;
export type SalesRefundMethods = (typeof SALES_REFUND_METHODS)[number];
export const SALES_REFUND_METHODS_OPTIONS: {
  label?: string;
  value?: SalesRefundMethods;
}[] = [...SALES_PAYMENT_METHOD_OPTIONS, { label: "Wallet", value: "wallet" }];

export const STOCK_STATUS = ["not managed", "in stock", "low stock"] as const;

export type StockStatus = (typeof STOCK_STATUS)[number];

export const STOCK_MODES = ["monitored", "unmonitored"] as const;
export type StockModes = (typeof STOCK_MODES)[number];

export const INVENTORY_STATUS = ["draft", "published", "archived"] as const;
export type INVENTORY_STATUS = (typeof INVENTORY_STATUS)[number];
export const INVENTORY_STATUS_OPTIONS: {
  label?: string;
  id?: INVENTORY_STATUS;
}[] = [
  { label: "Draft", id: "draft" },
  { label: "Published", id: "published" },
  { label: "Archive", id: "archived" },
];
