"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@gnd/ui/dialog";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import { Skeleton } from "@gnd/ui/skeleton";
import { toast } from "@gnd/ui/use-toast";
import { RotateCcw, Trash2, Calendar, User } from "lucide-react";
import { format } from "date-fns";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
};

export function DispatchDeletedPanel({ open, onOpenChange }: Props) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [restoringId, setRestoringId] = useState<number | null>(null);

    const deleted = useQuery(
        trpc.dispatch.getDeleted.queryOptions(undefined, {
            enabled: open,
            refetchOnWindowFocus: false,
        }),
    );

    const restore = useMutation(
        trpc.dispatch.restore.mutationOptions({
            onSuccess(_data, vars) {
                const id = (vars as { dispatchId: number })?.dispatchId;
                toast({
                    variant: "success",
                    title: "Dispatch restored",
                    description: id ? `Dispatch #${id} is back in queue.` : "Dispatch restored.",
                });
                deleted.refetch();
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchSummary.queryKey(),
                });
                setRestoringId(null);
            },
            onError(err) {
                toast({
                    variant: "error",
                    title: "Restore failed",
                    description: err.message,
                });
                setRestoringId(null);
            },
        }),
    );

    const rows = deleted.data ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle>Deleted Dispatches</DialogTitle>
                    <DialogDescription>
                        View and restore soft-deleted dispatches. Restored
                        dispatches return to &quot;queue&quot; status.
                    </DialogDescription>
                </DialogHeader>

                {deleted.isLoading && (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                )}

                {!deleted.isLoading && rows.length === 0 && (
                    <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">
                        No deleted dispatches found.
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {rows.map((row) => {
                        const orderLabel = row.order?.orderId ?? `#${row.id}`;
                        const customer =
                            row.order?.customer?.businessName ||
                            row.order?.customer?.name ||
                            "Unknown";
                        const deletedDate = row.deletedAt
                            ? format(new Date(row.deletedAt), "MMM d, yyyy")
                            : "—";
                        const dueDate = row.dueDate
                            ? format(new Date(row.dueDate), "MMM d, yyyy")
                            : "—";
                        return (
                            <div
                                key={row.id}
                                className="border rounded-lg p-3 flex items-start justify-between gap-3"
                            >
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            Order {orderLabel}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {row.status}
                                        </Badge>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {row.deliveryMode}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <User size={11} />{" "}
                                            {row.driver?.name ?? "Unassigned"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={11} /> Due {dueDate}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Trash2
                                                size={11}
                                                className="text-destructive"
                                            />{" "}
                                            Deleted {deletedDate}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {customer}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 shrink-0"
                                    disabled={
                                        restoringId === row.id ||
                                        restore.isPending
                                    }
                                    onClick={() => {
                                        setRestoringId(row.id);
                                        restore.mutate({ dispatchId: row.id });
                                    }}
                                >
                                    <RotateCcw size={13} />
                                    Restore
                                </Button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                        {rows.length} deleted record
                        {rows.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

