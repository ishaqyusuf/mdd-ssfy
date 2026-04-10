import { Icons } from "@gnd/ui/icons";


export const unitInvoiceReportDefinitions = [
  {
    id: "invoice-aging",
    title: "Invoice Aging Report",
    description:
      "Review open balances by age bucket using invoice created dates.",
    icon: Icons.FileClock,
  },
  {
    id: "task-level-detail",
    title: "Task-Level Invoice Detail Report",
    description:
      "Review invoice tasks by project and unit with cost, tax, due, and payment detail.",
    icon: Icons.FileText,
  },
] as const;

type UnitInvoiceReportId = (typeof unitInvoiceReportDefinitions)[number]["id"];

function getUnitInvoiceReportDefinition(reportId?: string | null) {
  return unitInvoiceReportDefinitions.find((item) => item.id === reportId);
}
