export type ExtraCostType =
  | "Discount"
  | "DiscountPercentage"
  | "Labor"
  | "FlatLabor"
  | "CustomTaxxable"
  | "CustomNonTaxxable"
  | "Delivery"
  | "EXT"
  | string;

export type NewSalesFormCostingStrategy = "current" | "legacy";

export type SalesFormStepLike = {
  step?: { title?: string | null } | null;
  value?: string | null;
};

export type SalesFormLineItemLike = {
  qty?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  taxxable?: boolean | null;
  meta?: Record<string, unknown> | null;
  formSteps?: SalesFormStepLike[] | null;
};

export type SalesFormExtraCostLike = {
  type: ExtraCostType;
  amount?: number | null;
  taxxable?: boolean | null;
};

export type CalculateSalesFormSummaryInput = {
  taxRate?: number | null;
  lineItems: SalesFormLineItemLike[];
  extraCosts?: SalesFormExtraCostLike[];
  paymentMethod?: string | null;
  strategy?: NewSalesFormCostingStrategy;
};

export type SalesFormSummaryResult = {
  subTotal: number;
  adjustedSubTotal: number;
  taxRate: number;
  taxTotal: number;
  grandTotal: number;
  discount: number;
  discountPct: number;
  percentDiscountValue: number;
  labor: number;
  delivery: number;
  otherCosts: number;
  taxableSubTotal: number;
  ccc: number;
  strategy: NewSalesFormCostingStrategy;
};
