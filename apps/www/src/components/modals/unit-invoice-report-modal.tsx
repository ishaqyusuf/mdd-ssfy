"use client";

import { InvoiceAgingReport } from "@/components/reports/unit-invoices/invoice-aging-report";
import { getUnitInvoiceReportDefinition } from "@/components/reports/unit-invoices/report-definitions";
import { useUnitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { useUnitInvoiceReportParams } from "@/hooks/use-unit-invoice-report-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { CustomModal } from "./custom-modal";

export function UnitInvoiceReportModal() {
  const trpc = useTRPC();
  const { filters } = useUnitInvoiceFilterParams();
  const { report, setParams } = useUnitInvoiceReportParams();
  const definition = getUnitInvoiceReportDefinition(report);

  const agingReport = useQuery(
    trpc.community.getUnitInvoiceAgingReport.queryOptions(filters, {
      enabled: report === "invoice-aging",
    }),
  );

  return (
    <CustomModal
      open={!!report}
      onOpenChange={(open) => {
        if (!open) {
          setParams(null);
        }
      }}
      size="5xl"
      title={definition?.title || "Invoice Report"}
      description={definition?.description}
    >
      <CustomModal.Content className="max-h-[70vh]">
        {report === "invoice-aging" ? (
          <InvoiceAgingReport
            data={agingReport.data}
            isPending={agingReport.isPending}
          />
        ) : null}
      </CustomModal.Content>
    </CustomModal>
  );
}
