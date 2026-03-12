"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

type GroupSelection = {
    keepDispatchId: number;
    deleteDispatchIds: number[];
};

export function DispatchSweeperModal() {
    const pathname = usePathname();
    const auth = useAuth();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [didAutoOpen, setDidAutoOpen] = useState(false);
    const [selectionBySalesId, setSelectionBySalesId] = useState<
        Record<number, GroupSelection>
    >({});

    const isDispatchPage = pathname?.endsWith("/sales-book/dispatch");
    const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
    const enabled = !!isDispatchPage && !!isSuperAdmin && !auth.isPending;

    const duplicateGroups = useQuery(
        trpc.dispatch.findDuplicateGroups.queryOptions(undefined, {
            enabled,
            refetchOnWindowFocus: false,
        }),
    );

    useEffect(() => {
        const groups = duplicateGroups.data?.groups || [];
        if (!groups.length) return;

        setSelectionBySalesId((prev) => {
            const next = { ...prev };
            for (const group of groups) {
                if (next[group.salesId]) continue;
                const keepDispatchId =
                    group.recommendedKeepDispatchId || group.dispatches?.[0]?.id;
                next[group.salesId] = {
                    keepDispatchId,
                    deleteDispatchIds: group.dispatches
                        .map((dispatch) => dispatch.id)
                        .filter((id) => id !== keepDispatchId),
                };
            }
            return next;
        });
    }, [duplicateGroups.data?.groups]);

    useEffect(() => {
        const hasGroups = (duplicateGroups.data?.groups?.length || 0) > 0;
        if (!enabled || didAutoOpen || !hasGroups) return;
        setOpen(true);
        setDidAutoOpen(true);
    }, [enabled, didAutoOpen, duplicateGroups.data?.groups?.length]);

    useEffect(() => {
        if (!open) return;
        if (duplicateGroups.isFetching || duplicateGroups.isLoading) return;
        if ((duplicateGroups.data?.groups?.length || 0) > 0) return;
        setOpen(false);
    }, [
        open,
        duplicateGroups.isFetching,
        duplicateGroups.isLoading,
        duplicateGroups.data?.groups?.length,
    ]);

    const resolveDuplicate = useMutation(
        trpc.dispatch.resolveDuplicateGroup.mutationOptions({
            onSuccess() {
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.assignedDispatch.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.findDuplicateGroups.queryKey(),
                });
                toast({
                    variant: "success",
                    title: "Dispatch duplicates resolved",
                    description: "Selected duplicate dispatches were cleaned.",
                });
            },
            onError(error) {
                toast({
                    variant: "error",
                    title: "Unable to resolve duplicates",
                    description: error.message || "Please try again.",
                });
            },
        }),
    );

    const groups = duplicateGroups.data?.groups || [];
    const hasGroups = groups.length > 0;

    const isBusy = duplicateGroups.isLoading || duplicateGroups.isFetching;

    const updateSelection = (salesId: number, next: Partial<GroupSelection>) => {
        setSelectionBySalesId((prev) => ({
            ...prev,
            [salesId]: {
                ...prev[salesId],
                ...next,
            },
        }));
    };

    const onKeepDispatch = (salesId: number, dispatchId: number) => {
        const current = selectionBySalesId[salesId];
        const deleteDispatchIds = (current?.deleteDispatchIds || []).filter(
            (id) => id !== dispatchId,
        );
        updateSelection(salesId, {
            keepDispatchId: dispatchId,
            deleteDispatchIds,
        });
    };

    const onToggleDelete = (
        salesId: number,
        dispatchId: number,
        checked: boolean,
    ) => {
        const current = selectionBySalesId[salesId];
        const currentDeleteIds = new Set(current?.deleteDispatchIds || []);
        if (checked) currentDeleteIds.add(dispatchId);
        else currentDeleteIds.delete(dispatchId);
        updateSelection(salesId, {
            deleteDispatchIds: [...currentDeleteIds],
        });
    };

    const onResolveGroup = (salesId: number) => {
        const selection = selectionBySalesId[salesId];
        if (!selection?.keepDispatchId || !selection?.deleteDispatchIds?.length) {
            toast({
                variant: "error",
                title: "Incomplete selection",
                description: "Select one keep dispatch and at least one duplicate to delete.",
            });
            return;
        }
        resolveDuplicate.mutate({
            salesId,
            keepDispatchId: selection.keepDispatchId,
            deleteDispatchIds: selection.deleteDispatchIds,
        });
    };

    if (!enabled) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle>Dispatch Sweeper</DialogTitle>
                    <DialogDescription>
                        Found sales orders with multiple active dispatches. Choose
                        which dispatch to keep and clean duplicate entries.
                    </DialogDescription>
                </DialogHeader>

                {!hasGroups && !isBusy && (
                    <div className="text-sm text-muted-foreground border rounded-md p-4">
                        No duplicate dispatch groups found.
                    </div>
                )}

                {groups.map((group) => {
                    const selection = selectionBySalesId[group.salesId];
                    return (
                        <div
                            key={group.salesId}
                            className="border rounded-md p-4 space-y-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium">
                                        Order {group.orderNo || group.salesId}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {group.duplicateCount} active dispatches
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    disabled={
                                        resolveDuplicate.isPending ||
                                        !selection?.deleteDispatchIds?.length
                                    }
                                    onClick={() => onResolveGroup(group.salesId)}
                                >
                                    Resolve Group
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {group.dispatches.map((dispatch) => {
                                    const isKeep =
                                        selection?.keepDispatchId === dispatch.id;
                                    const shouldDelete =
                                        selection?.deleteDispatchIds?.includes(
                                            dispatch.id,
                                        ) || false;
                                    return (
                                        <div
                                            key={dispatch.id}
                                            className="border rounded-md p-3 flex items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">
                                                    Dispatch #{dispatch.id} •{" "}
                                                    {dispatch.status || "queue"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Driver:{" "}
                                                    {dispatch.driverName || "Unassigned"}{" "}
                                                    • Items: {dispatch.itemCount} •
                                                    Packed: {dispatch.packedItemCount}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    size="sm"
                                                    variant={isKeep ? "default" : "outline"}
                                                    onClick={() =>
                                                        onKeepDispatch(
                                                            group.salesId,
                                                            dispatch.id,
                                                        )
                                                    }
                                                >
                                                    Keep
                                                </Button>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <Checkbox
                                                        checked={shouldDelete}
                                                        disabled={isKeep}
                                                        onCheckedChange={(value) =>
                                                            onToggleDelete(
                                                                group.salesId,
                                                                dispatch.id,
                                                                !!value,
                                                            )
                                                        }
                                                    />
                                                    Delete
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                    <Button
                        variant="secondary"
                        disabled={duplicateGroups.isFetching}
                        onClick={() => duplicateGroups.refetch()}
                    >
                        Refresh Scan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
