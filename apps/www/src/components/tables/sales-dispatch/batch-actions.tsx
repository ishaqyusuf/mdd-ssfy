"use client";

import { useState } from "react";
import { BatchAction, BatchBtn } from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useDriversList } from "@/hooks/use-data-list";
import { Loader2, UserCheck, XCircle } from "lucide-react";
import type { Item } from "./columns";
import { Menu } from "@gnd/ui/custom/menu";

function BulkAssignDriver({
    selectedIds,
    onDone,
}: {
    selectedIds: number[];
    onDone: () => void;
}) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const drivers = useDriversList(true);
    const [loading, setLoading] = useState(false);

    const bulkAssign = useMutation(
        trpc.dispatch.bulkAssignDriver.mutationOptions({
            onSuccess(data) {
                toast({
                    variant: "success",
                    title: `Assigned ${data.updated} dispatch${data.updated !== 1 ? "es" : ""}`,
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchSummary.queryKey(),
                });
                onDone();
            },
            onError(err) {
                toast({
                    variant: "error",
                    title: "Bulk assign failed",
                    description: err.message,
                });
            },
        }),
    );

    const menu = (
        <>
            {drivers.map((driver) => (
                <Menu.Item
                    key={driver.id}
                    onClick={() =>
                        bulkAssign.mutate({
                            dispatchIds: selectedIds,
                            newDriverId: driver.id,
                        })
                    }
                >
                    {driver.name}
                </Menu.Item>
            ))}
            <Menu.Item
                className="text-muted-foreground"
                onClick={() =>
                    bulkAssign.mutate({
                        dispatchIds: selectedIds,
                        newDriverId: null,
                    })
                }
            >
                Unassign driver
            </Menu.Item>
        </>
    );

    return (
        <BatchBtn icon="user" menu={menu} disabled={bulkAssign.isPending}>
            {bulkAssign.isPending ? (
                <Loader2 size={12} className="animate-spin mr-1" />
            ) : (
                <UserCheck size={12} className="mr-1" />
            )}
            Assign Driver
        </BatchBtn>
    );
}

function BulkCancel({
    selectedIds,
    onDone,
}: {
    selectedIds: number[];
    onDone: () => void;
}) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const bulkCancel = useMutation(
        trpc.dispatch.bulkCancel.mutationOptions({
            onSuccess(data) {
                toast({
                    variant: "success",
                    title: `Cancelled ${data.cancelled} dispatch${data.cancelled !== 1 ? "es" : ""}`,
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchSummary.queryKey(),
                });
                onDone();
            },
            onError(err) {
                toast({
                    variant: "error",
                    title: "Bulk cancel failed",
                    description: err.message,
                });
            },
        }),
    );

    return (
        <BatchBtn
            icon="X"
            disabled={bulkCancel.isPending}
            onClick={() => bulkCancel.mutate({ dispatchIds: selectedIds })}
        >
            {bulkCancel.isPending ? (
                <Loader2 size={12} className="animate-spin mr-1" />
            ) : (
                <XCircle size={12} className="mr-1" />
            )}
            Cancel All
        </BatchBtn>
    );
}

export function BatchActions({}) {
    const ctx = useTable();
    const selectedRows = ctx.selectedRows ?? [];
    if (!selectedRows.length) return null;

    const selectedIds = selectedRows
        .map((row) => (row.original as Item)?.id)
        .filter((id): id is number => typeof id === "number");

    function clearSelection() {
        ctx.table?.toggleAllPageRowsSelected(false);
    }

    return (
        <BatchAction>
            <BulkAssignDriver
                selectedIds={selectedIds}
                onDone={clearSelection}
            />
            <BulkCancel selectedIds={selectedIds} onDone={clearSelection} />
        </BatchAction>
    );
}

