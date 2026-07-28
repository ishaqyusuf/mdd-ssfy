"use client";

import { unitInvoiceReportDefinitions } from "@/components/reports/unit-invoices/report-definitions";
import { unitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import {
    printCommunityInvoiceAgingReport,
    printCommunityInvoiceTaskDetailReport,
} from "@/lib/unit-invoice-report-print";
import { AlertDialog, DropdownMenu } from "@gnd/ui/namespace";
import { useQueryStates } from "nuqs";
import { useState } from "react";

export function UnitInvoicesReportMenu() {
    const [filters] = useQueryStates(unitInvoiceFilterParams);
    const [showAllInvoicesAlert, setShowAllInvoicesAlert] = useState(false);
    const [pendingReportId, setPendingReportId] = useState<string | null>(null);
    const hasActiveFilters = Object.values(filters).some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined && value !== "";
    });

    const launchReport = async (reportId: string) => {
        if (reportId === "task-level-detail") {
            await printCommunityInvoiceTaskDetailReport(filters);
            return;
        }

        await printCommunityInvoiceAgingReport(filters);
    };

    const openReport = async (reportId: string) => {
        if (!hasActiveFilters) {
            setPendingReportId(reportId);
            setShowAllInvoicesAlert(true);
            return;
        }

        await launchReport(reportId);
    };

    return (
        <>
            <DropdownMenu.Content align="end" className="w-80">
                {unitInvoiceReportDefinitions.map((item) => {
                    const Icon = item.icon;

                    return (
                        <DropdownMenu.Item
                            key={item.id}
                            className="items-start gap-3 py-3"
                            onClick={() => openReport(item.id)}
                        >
                            <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
                                <Icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-slate-900">
                                    {item.title}
                                </p>
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {item.description}
                                </p>
                            </div>
                        </DropdownMenu.Item>
                    );
                })}
            </DropdownMenu.Content>
            <AlertDialog
                open={showAllInvoicesAlert}
                onOpenChange={(open) => {
                    setShowAllInvoicesAlert(open);
                    if (!open) setPendingReportId(null);
                }}
            >
                <AlertDialog.Content>
                    <AlertDialog.Header>
                        <AlertDialog.Title>
                            Run Report Across All Invoices?
                        </AlertDialog.Title>
                        <AlertDialog.Description>
                            No unit-invoice filters are currently selected. This
                            report will run through all system invoices. Use
                            filters to make the report more specific.
                        </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                        <AlertDialog.Action
                            onClick={async () => {
                                await launchReport(
                                    pendingReportId || "invoice-aging",
                                );
                                setPendingReportId(null);
                            }}
                        >
                            Continue
                        </AlertDialog.Action>
                    </AlertDialog.Footer>
                </AlertDialog.Content>
            </AlertDialog>
        </>
    );
}
