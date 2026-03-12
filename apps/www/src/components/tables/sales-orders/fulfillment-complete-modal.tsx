"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { cn } from "@/lib/utils";

type DriverOption = {
    id: number;
    name: string;
};

type DispatchItem = {
    packingStatus?: string | null;
    qty?: number | null;
    lhQty?: number | null;
    rhQty?: number | null;
};

export type FulfillmentDispatch = {
    id: number;
    status?: string | null;
    createdAt?: string | Date | null;
    driverId?: number | null;
    driver?: { id: number; name: string } | null;
    items?: DispatchItem[];
};

type CompletionMode = "pending_packing" | "pack_all";

interface FulfillmentCompleteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dispatches: FulfillmentDispatch[];
    drivers: DriverOption[];
    defaultRecipient: string;
    isLoading?: boolean;
    isSubmitting?: boolean;
    deletingDispatchId?: number | null;
    onDeleteDispatch: (dispatchId: number) => void;
    onConfirm: (payload: {
        selectedDispatchId: number | null;
        createNew: boolean;
        completionMode: CompletionMode;
        recipient: string;
        completedDate: Date;
        driverId: number | null;
    }) => void;
}

type SelectedDispatchKey = number | "new";

function toDateInputValue(date: Date) {
    return date.toISOString().slice(0, 10);
}

function parseDateInputValue(value: string) {
    if (!value) return new Date();
    return new Date(`${value}T00:00:00`);
}

function normalizeItemQty(item: DispatchItem) {
    if (item.qty != null) return Number(item.qty || 0);
    return Number(item.lhQty || 0) + Number(item.rhQty || 0);
}

function isCompleted(status?: string | null) {
    return status === "completed";
}

function isCancelled(status?: string | null) {
    return status === "cancelled";
}

export function FulfillmentCompleteModal({
    open,
    onOpenChange,
    dispatches,
    drivers,
    defaultRecipient,
    isLoading = false,
    isSubmitting = false,
    deletingDispatchId = null,
    onDeleteDispatch,
    onConfirm,
}: FulfillmentCompleteModalProps) {
    const sortedDispatches = React.useMemo(
        () =>
            [...dispatches].sort((a, b) => {
                const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return right - left;
            }),
        [dispatches],
    );
    const selectableDispatches = React.useMemo(
        () =>
            sortedDispatches.filter(
                (dispatch) =>
                    !isCompleted(dispatch.status) && !isCancelled(dispatch.status),
            ),
        [sortedDispatches],
    );

    const [selectedDispatchKey, setSelectedDispatchKey] =
        React.useState<SelectedDispatchKey>("new");
    const [completionMode, setCompletionMode] =
        React.useState<CompletionMode>("pending_packing");
    const [recipient, setRecipient] = React.useState(defaultRecipient || "");
    const [completedDateValue, setCompletedDateValue] = React.useState(
        toDateInputValue(new Date()),
    );
    const [driverId, setDriverId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!open) return;
        const defaultDispatch = selectableDispatches[0];
        const nextSelected: SelectedDispatchKey = defaultDispatch
            ? defaultDispatch.id
            : "new";
        setSelectedDispatchKey(nextSelected);
        setCompletionMode("pending_packing");
        setRecipient(defaultRecipient || "");
        setCompletedDateValue(toDateInputValue(new Date()));
        setDriverId(defaultDispatch?.driverId || null);
    }, [open, selectableDispatches, defaultRecipient]);

    React.useEffect(() => {
        if (selectedDispatchKey === "new") {
            setDriverId(null);
            return;
        }
        const selected = sortedDispatches.find(
            (dispatch) => dispatch.id === selectedDispatchKey,
        );
        setDriverId(selected?.driverId || null);
    }, [selectedDispatchKey, sortedDispatches]);

    const selectedDispatch =
        selectedDispatchKey === "new"
            ? null
            : sortedDispatches.find((dispatch) => dispatch.id === selectedDispatchKey) ||
              null;

    const packedQty = React.useMemo(() => {
        if (!selectedDispatch?.items?.length) return 0;
        return selectedDispatch.items
            .filter((item) => item.packingStatus === "packed")
            .reduce((total, item) => total + normalizeItemQty(item), 0);
    }, [selectedDispatch]);
    const pendingQty = React.useMemo(() => {
        if (!selectedDispatch?.items?.length) return 0;
        return selectedDispatch.items
            .filter((item) => item.packingStatus !== "packed")
            .reduce((total, item) => total + normalizeItemQty(item), 0);
    }, [selectedDispatch]);
    const hasMultipleDispatches = sortedDispatches.length > 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Fulfillment Complete</DialogTitle>
                    <DialogDescription>
                        Choose an existing dispatch or create a new one, then
                        complete fulfillment.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground border rounded-md p-3">
                            Loading dispatches...
                        </div>
                    ) : sortedDispatches.length ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Existing Dispatches</p>
                            {sortedDispatches.map((dispatch) => {
                                const dispatchPackedQty = (dispatch.items || [])
                                    .filter((item) => item.packingStatus === "packed")
                                    .reduce(
                                        (total, item) => total + normalizeItemQty(item),
                                        0,
                                    );
                                const dispatchPendingQty = (dispatch.items || [])
                                    .filter((item) => item.packingStatus !== "packed")
                                    .reduce(
                                        (total, item) => total + normalizeItemQty(item),
                                        0,
                                    );
                                const selectable =
                                    !isCompleted(dispatch.status) &&
                                    !isCancelled(dispatch.status);
                                const selected =
                                    selectedDispatchKey !== "new" &&
                                    selectedDispatchKey === dispatch.id;
                                return (
                                    <div
                                        key={dispatch.id}
                                        className={cn(
                                            "border rounded-md p-3 flex items-start justify-between gap-4",
                                            selected && selectable && "border-primary",
                                            !selectable && "opacity-70",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            className="text-left flex-1"
                                            disabled={!selectable}
                                            onClick={() =>
                                                selectable &&
                                                setSelectedDispatchKey(dispatch.id)
                                            }
                                        >
                                            <div className="font-medium">
                                                Dispatch #{dispatch.id}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Status: {dispatch.status || "queue"} | Previously
                                                packed: {dispatchPackedQty} | Pending packing:{" "}
                                                {dispatchPendingQty}
                                            </div>
                                        </button>
                                        {hasMultipleDispatches && !isCompleted(dispatch.status) && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    isSubmitting ||
                                                    deletingDispatchId === dispatch.id
                                                }
                                                onClick={() => onDeleteDispatch(dispatch.id)}
                                            >
                                                {deletingDispatchId === dispatch.id
                                                    ? "Deleting..."
                                                    : "Delete"}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground border rounded-md p-3">
                            No previous dispatch found. A new dispatch will be created.
                        </div>
                    )}

                    <div className="border rounded-md p-3 space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                checked={selectedDispatchKey === "new"}
                                onChange={() => setSelectedDispatchKey("new")}
                                disabled={isSubmitting}
                            />
                            Create New Dispatch
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                checked={completionMode === "pending_packing"}
                                onChange={() => setCompletionMode("pending_packing")}
                                disabled={isSubmitting}
                            />
                            Pending Packing (complete without auto pack-all)
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                checked={completionMode === "pack_all"}
                                onChange={() => setCompletionMode("pack_all")}
                                disabled={isSubmitting}
                            />
                            Pack All (auto pack remaining items, then complete)
                        </label>
                        {selectedDispatch && (
                            <div className="text-xs text-muted-foreground">
                                Selected dispatch pending packing: {pendingQty} | previously
                                packed: {packedQty}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Driver</label>
                            <select
                                className="w-full h-9 border rounded-md px-2 text-sm bg-background"
                                value={driverId == null ? "" : String(driverId)}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setDriverId(value ? Number(value) : null);
                                }}
                                disabled={isSubmitting}
                            >
                                <option value="">Unassigned</option>
                                {drivers.map((driver) => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Recipient</label>
                            <Input
                                value={recipient}
                                onChange={(event) => setRecipient(event.target.value)}
                                placeholder="Customer/Shipping recipient"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                                Completed Date
                            </label>
                            <Input
                                type="date"
                                value={completedDateValue}
                                onChange={(event) =>
                                    setCompletedDateValue(event.target.value)
                                }
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={isSubmitting || isLoading}
                        onClick={() =>
                            onConfirm({
                                selectedDispatchId:
                                    selectedDispatchKey === "new"
                                        ? null
                                        : selectedDispatchKey,
                                createNew: selectedDispatchKey === "new",
                                completionMode,
                                recipient,
                                completedDate: parseDateInputValue(completedDateValue),
                                driverId,
                            })
                        }
                    >
                        {isSubmitting ? "Processing..." : "Complete Fulfillment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
