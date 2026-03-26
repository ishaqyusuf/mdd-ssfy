"use client";

import { useCallback, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { Download, Loader2 } from "lucide-react";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";

function toCsv(rows: Record<string, string | number | null | undefined>[]) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]!);
    const escape = (v: unknown) => {
        const str = String(v ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
    };
    return [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
    ].join("\n");
}

export function DispatchExportButton() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { filters } = useDispatchFilterParams();
    const [exporting, setExporting] = useState(false);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const data = await queryClient.fetchQuery(
                trpc.dispatch.exportDispatches.queryOptions({
                    tab: filters.tab,
                    status: filters.status,
                    q: filters.q,
                    driversId: filters.driversId,
                    scheduleDate: filters.scheduleDate as string[] | null,
                } as any),
            );
            if (!data?.length) {
                toast({ variant: "error", title: "No data to export" });
                return;
            }
            const csv = toCsv(data);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dispatches-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast({
                variant: "success",
                title: `Exported ${data.length} dispatches`,
            });
        } catch (e: any) {
            toast({
                variant: "error",
                title: "Export failed",
                description: e?.message,
            });
        } finally {
            setExporting(false);
        }
    }, [trpc, queryClient, filters]);

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            // disabled={exporting}
            disabled
            className="gap-1.5"
        >
            {exporting ? (
                <Loader2 size={14} className="animate-spin" />
            ) : (
                <Download size={14} />
            )}
            Export CSV
        </Button>
    );
}

