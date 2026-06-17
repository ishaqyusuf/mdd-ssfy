"use client";

import { Badge } from "@gnd/ui/badge";
import { Card } from "@gnd/ui/namespace";

type InboundStatusDemandReconciliation = {
    summary: {
        issueCount: number;
        orderStatusWithoutDemandCount: number;
        availableWithDemandCount: number;
        openDemandQty: number;
    };
    rows: Array<{
        saleId: number;
        orderId: string | null;
        inventoryStatus: string | null;
        openDemandCount: number;
        openDemandQty: number;
        issue: string;
        severity: string;
        demandPreview: Array<{
            inventoryName: string | null;
            lineTitle: string | null;
            sku: string | null;
        }>;
    }>;
} | null;

function formatLabel(value: string | null | undefined) {
    return value ? value.replaceAll("_", " ") : "unknown";
}

function formatInboundReconciliationIssue(value: string) {
    switch (value) {
        case "order_status_without_inventory_demand":
            return "Status without demand";
        case "available_status_with_open_inventory_demand":
            return "Available with open demand";
        case "pending_order_has_ordered_inventory_demand":
            return "Pending but already ordered";
        default:
            return formatLabel(value);
    }
}

export function InboundStatusReconciliationPanel({
    reconciliation,
}: {
    reconciliation: InboundStatusDemandReconciliation;
}) {
    const rows = reconciliation?.rows ?? [];
    const summary = reconciliation?.summary;

    return (
        <Card className="p-4 space-y-4">
            <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold">
                            Inbound Reconciliation
                        </h3>
                        <p className="text-xs text-slate-500">
                            Order prompts matched against inventory demand.
                        </p>
                    </div>
                    <Badge variant="outline">{summary?.issueCount ?? 0}</Badge>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <p className="text-sm font-semibold text-slate-900">
                        {summary?.orderStatusWithoutDemandCount ?? 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        No demand
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <p className="text-sm font-semibold text-slate-900">
                        {summary?.availableWithDemandCount ?? 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Available
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <p className="text-sm font-semibold text-slate-900">
                        {Number(summary?.openDemandQty ?? 0)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Open qty
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                {rows.slice(0, 5).map((row) => (
                    <div
                        key={`${row.saleId}:${row.issue}`}
                        className="rounded-xl border border-slate-200 p-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">
                                    {row.orderId
                                        ? `Order ${row.orderId}`
                                        : `Sale #${row.saleId}`}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formatLabel(row.inventoryStatus)}
                                </p>
                            </div>
                            <Badge
                                variant="outline"
                                className={
                                    row.severity === "critical"
                                        ? "max-w-[150px] whitespace-normal border-rose-200 bg-rose-50 text-left leading-tight text-rose-700"
                                        : "max-w-[150px] whitespace-normal border-amber-200 bg-amber-50 text-left leading-tight text-amber-700"
                                }
                            >
                                {formatInboundReconciliationIssue(row.issue)}
                            </Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                            {row.openDemandCount} open demand rows, qty{" "}
                            {Number(row.openDemandQty || 0)}
                        </p>
                        {row.demandPreview.length ? (
                            <p className="mt-1 truncate text-xs text-slate-500">
                                {row.demandPreview
                                    .map(
                                        (demand) =>
                                            demand.inventoryName ||
                                            demand.lineTitle ||
                                            demand.sku,
                                    )
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        ) : null}
                    </div>
                ))}

                {!rows.length ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                        No inbound prompt mismatches in the latest reviewed
                        orders.
                    </div>
                ) : null}
            </div>
        </Card>
    );
}
