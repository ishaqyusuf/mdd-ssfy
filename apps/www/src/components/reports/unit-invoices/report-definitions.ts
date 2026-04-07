import { FileClock } from "lucide-react";

export const unitInvoiceReportDefinitions = [
  {
    id: "invoice-aging",
    title: "Invoice Aging Report",
    description:
      "Review open balances by age bucket using invoice created dates.",
    icon: FileClock,
  },
] as const;

export type UnitInvoiceReportId = (typeof unitInvoiceReportDefinitions)[number]["id"];

export function getUnitInvoiceReportDefinition(reportId?: string | null) {
  return unitInvoiceReportDefinitions.find((item) => item.id === reportId);
}
