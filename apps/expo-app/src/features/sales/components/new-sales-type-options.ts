import type { NewSalesFormType } from "@/features/sales/invoice-form/types";

export type NewSalesTypeOption = {
  type: NewSalesFormType;
  title: string;
  description: string;
  icon: "ReceiptText" | "FileText";
};

export const newSalesTypeOptions: NewSalesTypeOption[] = [
  {
    type: "order",
    title: "Sales",
    description: "Create a sales invoice for an order.",
    icon: "ReceiptText",
  },
  {
    type: "quote",
    title: "Quote",
    description: "Prepare a customer quote before approval.",
    icon: "FileText",
  },
];

export function getNewSalesCustomerSelectorRoute(type: NewSalesFormType) {
  return {
    pathname: "/(sales)/invoices/customer-selector",
    params: { type, source: "new" },
  } as const;
}
