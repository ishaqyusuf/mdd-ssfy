"use client";

import {
    _completeManyUnitTaskProductions,
    _startManyUnitTaskProductions,
    _stopManyUnitTaskProductions,
} from "@/app-deps/(v1)/_actions/community-production/prod-actions";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { BatchAction } from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "sonner";
import { Check, Play, StopCircle } from "lucide-react";
import type { Item } from "./columns";

async function invalidateProductionQueries(queryClient, trpc) {
    await Promise.all([
        queryClient.invalidateQueries({
            queryKey: trpc.community.getUnitProductions.infiniteQueryKey(),
        }),
        queryClient.invalidateQueries({
            queryKey: trpc.community.getUnitProductionSummary.queryKey(),
        }),
    ]);
}

function BatchButton({
    label,
    Icon,
    onClick,
    disabled = false,
    className = "",
}: {
    label: string;
    Icon: typeof Play;
    onClick: () => Promise<void>;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <Button
            variant="ghost"
            className={`rounded-none ${className}`}
            disabled={disabled}
            onClick={() => {
                void onClick();
            }}
        >
            <Icon className="mr-2 size-4" />
            {label}
        </Button>
    );
}

export function BatchActions() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const ctx = useTable();
    const selectedRows = ctx.selectedRows ?? [];
    if (!selectedRows.length) return null;

    const items = selectedRows.map((row) => row.original as Item);
    const ids = items.map((item) => item.id);

    async function runAction(
        action: (ids: number[]) => Promise<void>,
        successMessage: string,
    ) {
        await action(ids);
        await invalidateProductionQueries(queryClient, trpc);
        ctx.table?.toggleAllPageRowsSelected(false);
        toast.success(successMessage);
    }

    return (
        <BatchAction>
            <BatchButton
                label="Start"
                Icon={Play}
                onClick={() =>
                    runAction(
                        _startManyUnitTaskProductions,
                        `Started ${ids.length} production task${ids.length !== 1 ? "s" : ""}`,
                    )
                }
                className="text-sky-700"
            />
            <BatchButton
                label="Stop"
                Icon={StopCircle}
                onClick={() =>
                    runAction(
                        _stopManyUnitTaskProductions,
                        `Stopped ${ids.length} production task${ids.length !== 1 ? "s" : ""}`,
                    )
                }
                className="text-red-700"
            />
            <BatchButton
                label="Complete"
                Icon={Check}
                onClick={() =>
                    runAction(
                        _completeManyUnitTaskProductions,
                        `Completed ${ids.length} production task${ids.length !== 1 ? "s" : ""}`,
                    )
                }
                className="text-emerald-700"
            />
        </BatchAction>
    );
}
