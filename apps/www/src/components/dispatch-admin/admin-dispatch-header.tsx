"use client";

import { DispatchSearchFilter } from "@/components/dispatch-search-filter";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Button } from "@gnd/ui/button";
import { ShieldAlert, Trash2, LayoutGrid, Table2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { useEffect, useState } from "react";
import { toast } from "@gnd/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Button as Btn } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { DispatchAutoRefresh } from "@/components/dispatch-admin/dispatch-auto-refresh";
import { DispatchExportButton } from "@/components/dispatch-admin/dispatch-export-button";
import { DispatchDeletedPanel } from "@/components/dispatch-admin/dispatch-deleted-panel";

type GroupSelection = {
    keepDispatchId: number;
    deleteDispatchIds: number[];
};

function SweeperDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [selectionBySalesId, setSelectionBySalesId] = useState<
        Record<number, GroupSelection>
    >({});

    const duplicateGroups = useQuery(
        trpc.dispatch.findDuplicateGroups.queryOptions(undefined, {
            enabled: open,
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
                    group.recommendedKeepDispatchId ||
                    group.dispatches?.[0]?.id;
                next[group.salesId] = {
                    keepDispatchId,
                    deleteDispatchIds: group.dispatches
                        .map((d) => d.id)
                        .filter((id) => id !== keepDispatchId),
                };
            }
            return next;
        });
    }, [duplicateGroups.data?.groups]);

    const resolveDuplicate = useMutation(
        trpc.dispatch.resolveDuplicateGroup.mutationOptions({
            onSuccess() {
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchSummary.queryKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.findDuplicateGroups.queryKey(),
                });
                toast({
                    variant: "success",
                    title: "Duplicates resolved",
                    description: "Selected duplicate dispatches cleaned.",
                });
            },
            onError(error) {
                toast({
                    variant: "error",
                    title: "Unable to resolve",
                    description: error.message || "Please try again.",
                });
            },
        }),
    );

    const groups = duplicateGroups.data?.groups || [];

    const updateSelection = (
        salesId: number,
        next: Partial<GroupSelection>,
    ) => {
        setSelectionBySalesId((prev) => ({
            ...prev,
            [salesId]: { ...prev[salesId], ...next },
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle>Dispatch Sweeper</DialogTitle>
                    <DialogDescription>
                        Detect and resolve orders with multiple active
                        dispatches.
                    </DialogDescription>
                </DialogHeader>

                {duplicateGroups.isLoading && (
                    <p className="text-sm text-muted-foreground">Scanning…</p>
                )}

                {!duplicateGroups.isLoading && groups.length === 0 && (
                    <div className="text-sm text-muted-foreground border rounded-md p-4">
                        No duplicate dispatch groups found. ✓
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
                                <Btn
                                    size="sm"
                                    disabled={
                                        resolveDuplicate.isPending ||
                                        !selection?.deleteDispatchIds?.length
                                    }
                                    onClick={() => {
                                        if (
                                            !selection?.keepDispatchId ||
                                            !selection?.deleteDispatchIds
                                                ?.length
                                        ) {
                                            toast({
                                                variant: "error",
                                                title: "Incomplete selection",
                                                description:
                                                    "Pick one to keep and mark duplicates to delete.",
                                            });
                                            return;
                                        }
                                        resolveDuplicate.mutate({
                                            salesId: group.salesId,
                                            keepDispatchId:
                                                selection.keepDispatchId,
                                            deleteDispatchIds:
                                                selection.deleteDispatchIds,
                                        });
                                    }}
                                >
                                    Resolve Group
                                </Btn>
                            </div>
                            <div className="space-y-2">
                                {group.dispatches.map((dispatch) => {
                                    const isKeep =
                                        selection?.keepDispatchId ===
                                        dispatch.id;
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
                                                    {dispatch.driverName ||
                                                        "Unassigned"}{" "}
                                                    • Items:{" "}
                                                    {dispatch.itemCount} •
                                                    Packed:{" "}
                                                    {dispatch.packedItemCount}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Btn
                                                    size="sm"
                                                    variant={
                                                        isKeep
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    onClick={() =>
                                                        updateSelection(
                                                            group.salesId,
                                                            {
                                                                keepDispatchId:
                                                                    dispatch.id,
                                                                deleteDispatchIds:
                                                                    (
                                                                        selection?.deleteDispatchIds ||
                                                                        []
                                                                    ).filter(
                                                                        (id) =>
                                                                            id !==
                                                                            dispatch.id,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                >
                                                    Keep
                                                </Btn>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <Checkbox
                                                        checked={shouldDelete}
                                                        disabled={isKeep}
                                                        onCheckedChange={(
                                                            value,
                                                        ) => {
                                                            const ids = new Set(
                                                                selection?.deleteDispatchIds ||
                                                                    [],
                                                            );
                                                            if (value)
                                                                ids.add(
                                                                    dispatch.id,
                                                                );
                                                            else
                                                                ids.delete(
                                                                    dispatch.id,
                                                                );
                                                            updateSelection(
                                                                group.salesId,
                                                                {
                                                                    deleteDispatchIds:
                                                                        [
                                                                            ...ids,
                                                                        ],
                                                                },
                                                            );
                                                        }}
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
                    <Btn variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Btn>
                    <Btn
                        variant="secondary"
                        disabled={duplicateGroups.isFetching}
                        onClick={() => duplicateGroups.refetch()}
                    >
                        Refresh Scan
                    </Btn>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function AdminDispatchHeader() {
    const { filters, setFilters } = useDispatchFilterParams();
    const [sweeperOpen, setSweeperOpen] = useState(false);
    const [deletedOpen, setDeletedOpen] = useState(false);
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const auth = useAuth();
    const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";

    const tabValue =
        filters.tab ||
        (filters.status === "completed" ? "completed" : "pending");

    const currentView = filters.view ?? "table";

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <Tabs
                        value={tabValue}
                        onValueChange={(value) => {
                            const nextTab =
                                value === "all" ||
                                value === "pending" ||
                                value === "completed"
                                    ? value
                                    : "pending";
                            setFilters({
                                tab: nextTab,
                                status:
                                    nextTab === "completed" ? "completed" : null,
                            });
                        }}
                    >
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* View toggle: table / calendar */}
                    <div className="flex items-center rounded-md border overflow-hidden">
                        <Button
                            variant={currentView === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-none border-0 gap-1.5 h-8"
                            onClick={() => setFilters({ view: "table" })}
                            title="Table view"
                        >
                            <Table2 size={14} />
                        </Button>
                        <Button
                            variant={currentView === "calendar" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-none border-0 gap-1.5 h-8 border-l"
                            onClick={() => setFilters({ view: "calendar" })}
                            title="Calendar view"
                        >
                            <LayoutGrid size={14} />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <DispatchAutoRefresh />
                    <DispatchExportButton />
                    {isSuperAdmin && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletedOpen(true)}
                                className="gap-1.5 text-muted-foreground"
                            >
                                <Trash2 size={14} />
                                Deleted
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSweeperOpen(true)}
                                className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                            >
                                <ShieldAlert size={14} />
                                Duplicate Sweeper
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <DispatchSearchFilter />

            {isSuperAdmin && (
                <>
                    <SweeperDialog
                        open={sweeperOpen}
                        onOpenChange={setSweeperOpen}
                    />
                    <DispatchDeletedPanel
                        open={deletedOpen}
                        onOpenChange={setDeletedOpen}
                    />
                </>
            )}
        </div>
    );
}

