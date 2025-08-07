export type SalesResolutionConflictType = (typeof conflictType)[number];
export const conflictType = [
  "duplicate payments",
  "payment not up to date",
  "overpayment",
  "resolved",
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
