"use client";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import CustomSheet from "@gnd/ui/custom/sheet-v2";
import { Skeleton } from "@gnd/ui/skeleton";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type PackingSideSheetProps = {
    availableCount: number;
    children: ReactNode;
    dispatchId?: number | null;
    formId: string;
    isPackAllActive: boolean;
    isSubmitting: boolean;
    layout?: "sheet" | "floating" | "inline";
    maxPackableCount: number;
    onCancel: () => void;
    onPackAll: () => void;
    onSubmit: () => void;
    orderNo?: string | null;
    packAllDisabled: boolean;
    pendingCount: number;
    selectedCount: number;
    submitDisabled: boolean;
};

export function PackingSideSheetSkeleton() {
    return (
        <CustomSheet
            hideClose
            onOpenChange={() => undefined}
            open
            primarySize="2xl"
            sheetName="dispatch-packing-drawer-loading"
        >
            <CustomSheet.Header className="flex-row items-start gap-3 text-left">
                <CustomSheet.Title className="sr-only">
                    Loading packing form
                </CustomSheet.Title>
                <CustomSheet.Description className="sr-only">
                    Preparing the selected dispatch items.
                </CustomSheet.Description>
                <div
                    aria-busy="true"
                    aria-label="Loading packing form"
                    className="flex min-w-0 flex-1 items-start justify-between gap-3"
                >
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-48 max-w-[55vw]" />
                    </div>
                    <Skeleton className="h-7 w-36 rounded-full" />
                </div>
                <Skeleton className="size-9 shrink-0 rounded-md" />
            </CustomSheet.Header>

            <CustomSheet.Content contentClassName="gap-0 pb-4 sm:pb-4">
                <div className="-mx-4 flex min-h-0 flex-1 flex-col overflow-hidden md:-mx-6">
                    <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="hidden h-3 w-56 sm:block" />
                        </div>
                        <Skeleton className="h-8 w-full rounded-md sm:w-36" />
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <div className="divide-y px-4 sm:px-6">
                            {[1, 2, 3, 4, 5].map((row) => (
                                <div key={row} className="space-y-3 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <Skeleton className="h-4 w-52 max-w-full" />
                                            <Skeleton className="h-3 w-64 max-w-[85%]" />
                                        </div>
                                        <Skeleton className="h-6 w-20 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                        <Skeleton className="h-9 w-full rounded-md" />
                                        <div className="flex gap-2">
                                            <Skeleton className="size-9 rounded-md" />
                                            <Skeleton className="size-9 rounded-md" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CustomSheet.Content>

            <CustomSheet.Footer className="flex-row items-center justify-between gap-3 border-t pt-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-md" />
                </div>
            </CustomSheet.Footer>
        </CustomSheet>
    );
}

export function PackingSideSheet({
    availableCount,
    children,
    dispatchId,
    formId,
    isPackAllActive,
    isSubmitting,
    layout = "sheet",
    maxPackableCount,
    onCancel,
    onPackAll,
    onSubmit,
    orderNo,
    packAllDisabled,
    pendingCount,
    selectedCount,
    submitDisabled,
}: PackingSideSheetProps) {
    const remainingCount = Math.max(0, maxPackableCount - selectedCount);
    const status = (
        <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            {availableCount} ready · {pendingCount} waiting
        </div>
    );
    const form = (
        <form
            id={formId}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <div className="flex flex-col gap-3 border-y bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <div className="flex min-w-0 items-center gap-4">
                    <p className="shrink-0 text-sm font-semibold">
                        <span className="text-primary">{selectedCount}</span> of{" "}
                        {maxPackableCount} selected
                    </p>
                    <p className="hidden truncate text-xs text-muted-foreground sm:block">
                        This replaces the current packing list.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onPackAll}
                    disabled={packAllDisabled}
                    className="shrink-0"
                >
                    {isPackAllActive
                        ? "Clear quantities"
                        : `Select all ${maxPackableCount}`}
                </Button>
            </div>
            {children}
        </form>
    );
    const footer = (
        <>
            <div className="min-w-0">
                <p className="text-sm font-semibold">
                    <span data-packing-selected-count>{selectedCount}</span>{" "}
                    units selected
                </p>
                <p className="text-xs text-muted-foreground">
                    {remainingCount} selectable units remain
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitDisabled}
                    className="min-w-24"
                >
                    {isSubmitting ? "Packing..." : `Pack ${selectedCount}`}
                </Button>
            </div>
        </>
    );

    if (layout === "inline") {
        return (
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
                <header className="flex flex-wrap items-start gap-3 border-b px-4 py-4 md:px-6">
                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold">Pack items</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Order {orderNo || "-"} · Dispatch #
                            {dispatchId || "-"}
                        </p>
                    </div>
                    {status}
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">{form}</div>
                <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-4 backdrop-blur md:px-6">
                    {footer}
                </footer>
            </section>
        );
    }

    if (layout === "floating") {
        return (
            <CustomSheet
                hideClose
                onOpenChange={(open) => !open && onCancel()}
                open
                primarySize="2xl"
                sheetName={`dispatch-packing-drawer-${dispatchId || "unknown"}`}
            >
                <CustomSheet.Header className="flex-row items-start gap-3 text-left">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <CustomSheet.Title>
                                    Pack items
                                </CustomSheet.Title>
                                <CustomSheet.Description className="mt-1">
                                    Order {orderNo || "-"} · Dispatch #
                                    {dispatchId || "-"}
                                </CustomSheet.Description>
                            </div>
                            {status}
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Close packing form"
                        onClick={onCancel}
                        className="shrink-0"
                    >
                        <X className="size-4" />
                    </Button>
                </CustomSheet.Header>
                <CustomSheet.Content contentClassName="gap-0 pb-4 sm:pb-4">
                    <div className="-mx-4 md:-mx-6">{form}</div>
                </CustomSheet.Content>
                <CustomSheet.Footer className="flex-row items-center justify-between gap-3 border-t pt-4">
                    {footer}
                </CustomSheet.Footer>
            </CustomSheet>
        );
    }

    return (
        <CustomSheet.SecondaryContent
            Header={
                <CustomSheet.SecondaryHeader
                    actions={status}
                    description={`Order ${orderNo || "-"} · Dispatch #${dispatchId || "-"}`}
                    title="Pack items"
                />
            }
            Footer={
                <CustomSheet.SecondaryFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
                    {footer}
                </CustomSheet.SecondaryFooter>
            }
        >
            <div className="-mx-4 md:-mx-6">{form}</div>
        </CustomSheet.SecondaryContent>
    );
}

export function PackingSideSheetSection({
    children,
    label,
    lineCount,
    tone = "ready",
    unitCount,
}: {
    children: ReactNode;
    label: string;
    lineCount: number;
    tone?: "ready" | "waiting";
    unitCount: number;
}) {
    return (
        <section aria-label={label}>
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:px-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                    <span
                        className={cn(
                            "size-2 rounded-full",
                            tone === "ready"
                                ? "bg-emerald-600"
                                : "bg-amber-600",
                        )}
                    />
                    {label}
                </div>
                <p className="text-xs text-muted-foreground">
                    {unitCount} units · {lineCount} lines
                </p>
            </header>
            <div className="px-4 md:px-6">{children}</div>
        </section>
    );
}
