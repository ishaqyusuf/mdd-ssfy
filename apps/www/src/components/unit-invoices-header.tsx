"use client";

import { Icons } from "@gnd/ui/icons";

import { unitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { DropdownMenu } from "@gnd/ui/namespace";
import dynamic from "next/dynamic";
import { useState } from "react";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

const UnitInvoicesReportMenu = dynamic(
    () =>
        import("./unit-invoices-report-menu").then(
            (mod) => mod.UnitInvoicesReportMenu,
        ),
    {
        loading: () => (
            <DropdownMenu.Content align="end" className="w-80">
                <div className="grid gap-3 p-3">
                    <div className="h-14 animate-pulse rounded-xl bg-muted" />
                    <div className="h-14 animate-pulse rounded-xl bg-muted" />
                </div>
            </DropdownMenu.Content>
        ),
    },
);

export function UnitInvoicesHeader() {
    const trpc = useTRPC();
    const [reportMenuOpen, setReportMenuOpen] = useState(false);
    const [hasLoadedReportMenu, setHasLoadedReportMenu] = useState(false);

    return (
        <div className="flex justify-between gap-4">
            <SearchFilter
                filterSchema={unitInvoiceFilterParams}
                placeholder="Search unit invoices..."
                trpcRoute={trpc.filters.projectUnit}
            />
            <DropdownMenu.Root
                open={reportMenuOpen}
                onOpenChange={(open) => {
                    setReportMenuOpen(open);
                    if (open) setHasLoadedReportMenu(true);
                }}
            >
                <DropdownMenu.Trigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Icons.FileSpreadsheet className="size-4" />
                        <span className="hidden lg:inline">Report</span>
                    </Button>
                </DropdownMenu.Trigger>
                {hasLoadedReportMenu ? <UnitInvoicesReportMenu /> : null}
            </DropdownMenu.Root>
        </div>
    );
}
