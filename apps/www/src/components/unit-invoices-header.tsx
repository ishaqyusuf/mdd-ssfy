"use client";

import { unitInvoiceReportDefinitions } from "@/components/reports/unit-invoices/report-definitions";
import { useUnitInvoiceReportParams } from "@/hooks/use-unit-invoice-report-params";
import { unitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { DropdownMenu } from "@gnd/ui/namespace";
import { SearchFilter } from "@gnd/ui/search-filter";
import { FileSpreadsheet } from "lucide-react";
import { useQueryStates } from "nuqs";

export function UnitInvoicesHeader() {
  const trpc = useTRPC();
  const [filters, setFilters] = useQueryStates(unitInvoiceFilterParams);
  const { setParams: setReportParams } = useUnitInvoiceReportParams();

  return (
    <div className="flex justify-between gap-4">
      <SearchFilter
        filterSchema={unitInvoiceFilterParams}
        placeholder="Search unit invoices..."
        trpcRoute={trpc.filters.projectUnit}
        {...{ filters, setFilters }}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="size-4" />
            Report
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="w-80">
          {unitInvoiceReportDefinitions.map((item) => {
            const Icon = item.icon;

            return (
              <DropdownMenu.Item
                key={item.id}
                className="items-start gap-3 py-3"
                onClick={() => {
                  setReportParams({
                    report: item.id,
                  });
                }}
              >
                <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
