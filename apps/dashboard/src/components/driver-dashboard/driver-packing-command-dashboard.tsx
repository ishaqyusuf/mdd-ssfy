"use client";

import {
    DRIVER_STOP_URL_OPTIONS,
    useDriverDashboardParams,
} from "@/hooks/use-driver-dashboard-params";
import { useDriverDispatchActions } from "@/hooks/use-driver-dispatch-actions";
import { DEFAULT_DISPATCH_TIME_ZONE } from "@gnd/sales/dispatch-manifest/driver-work-queue";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/progress";
import {
    CheckCircle2,
    CircleHelp,
    History,
    MapPin,
    PackageCheck,
    Phone,
    Route,
    Truck,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { PackingSideSheetSkeleton } from "../dispatch-packing-overview/packing-side-sheet";
import type { DriverStopDetail } from "./driver-stop-types";
import { getDriverPrimaryAction } from "./model";

const DispatchPackingOverview = dynamic(
    () =>
        import("@/components/dispatch-packing-overview").then(
            (module) => module.DispatchPackingOverview,
        ),
    { loading: () => <PackingSideSheetSkeleton />, ssr: false },
);

type QuantityLike = {
    qty?: number | null;
    lh?: number | null;
    rh?: number | null;
    total?: number | null;
};

function quantityTotal(value: unknown) {
    if (!value || typeof value !== "object") return 0;
    const quantity = value as QuantityLike;
    if (typeof quantity.total === "number") return quantity.total;
    const single = Math.max(0, Number(quantity.qty || 0));
    const handled =
        Math.max(0, Number(quantity.lh || 0)) +
        Math.max(0, Number(quantity.rh || 0));
    return single > 0 ? single : handled;
}

function formatAddress(address: DriverStopDetail["address"]) {
    const value = (address || {}) as Record<string, unknown>;
    return [
        value.address1,
        value.address2,
        [value.city, value.state].filter(Boolean).join(", "),
        value.country,
    ]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" · ");
}

function formatDeliveryTime(value: Date | string | null | undefined) {
    if (!value) return "Schedule pending";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Schedule pending";
    return `Delivery ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: DEFAULT_DISPATCH_TIME_ZONE,
    })} at ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: DEFAULT_DISPATCH_TIME_ZONE,
    })}`;
}

function itemPresentation(item: DriverStopDetail["dispatchItems"][number]) {
    const title =
        item.title || item.subtitle || item.sectionTitle || "Manifest item";
    const description = [
        item.subtitle,
        item.sectionTitle,
        item.size,
        item.handingLabel,
    ]
        .map((value) => String(value || "").trim())
        .filter(
            (value, index, values) => value && values.indexOf(value) === index,
        )
        .join(" · ");
    return { title, description: description || "Dispatch manifest item" };
}

function statusFor(packed: number, target: number) {
    if (target > 0 && packed >= target) {
        return {
            label: "Packed",
            className:
                "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
        };
    }
    if (packed > 0) {
        return {
            label: "Partial",
            className:
                "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
        };
    }
    return {
        label: "Unpacked",
        className:
            "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
    };
}

function CommandMetric({
    label,
    note,
    tone = "default",
    value,
}: {
    label: string;
    note: string;
    tone?: "default" | "success" | "warning";
    value: string;
}) {
    return (
        <div className="min-w-[9.5rem] flex-1 border-r border-border/80 px-4 py-4 last:border-r-0 lg:min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
                className={cn(
                    "mt-3 text-xl font-semibold tracking-tight",
                    tone === "success" &&
                        "text-emerald-700 dark:text-emerald-300",
                    tone === "warning" && "text-amber-700 dark:text-amber-300",
                )}
            >
                {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
    );
}

function PackingList({
    detail,
    onPack,
    canEditPacking,
    showPackAction = true,
}: {
    detail: DriverStopDetail;
    onPack: () => void;
    canEditPacking: boolean;
    showPackAction?: boolean;
}) {
    return (
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
            <header className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
                <div>
                    <h2 className="font-semibold">Packing list</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Pack exact quantities. Pending review never counts as
                        packed.
                    </p>
                </div>
                {canEditPacking && showPackAction ? (
                    <Button
                        variant="outline"
                        onClick={onPack}
                        className="hidden sm:flex"
                    >
                        Pack items
                    </Button>
                ) : null}
            </header>
            <div className="divide-y px-4 sm:px-5">
                {detail.dispatchItems.map((item) => {
                    const packed = quantityTotal(item.packedQty);
                    const listed = quantityTotal(item.listedQty);
                    const ordered = quantityTotal(item.totalQty);
                    const target = listed > 0 ? listed : ordered;
                    const percent = target
                        ? Math.min(100, Math.round((packed / target) * 100))
                        : 0;
                    const status = statusFor(packed, target);
                    const presentation = itemPresentation(item);

                    return (
                        <article
                            key={item.uid}
                            className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-center sm:gap-4"
                        >
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold uppercase">
                                    {presentation.title}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {presentation.description}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold tabular-nums">
                                    {packed} / {target}
                                </p>
                                <Progress
                                    value={percent}
                                    className="mt-2 h-1.5"
                                />
                            </div>
                            <div className="flex items-center sm:block">
                                <Badge
                                    variant="outline"
                                    className={status.className}
                                >
                                    {status.label}
                                </Badge>
                            </div>
                            {canEditPacking ? (
                                <Button
                                    variant="outline"
                                    onClick={onPack}
                                    className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                                >
                                    {packed > 0 ? "Edit" : "Pack"}
                                </Button>
                            ) : status.label === "Packed" ? (
                                <CheckCircle2 className="size-5 text-emerald-600" />
                            ) : (
                                <span className="text-xs text-muted-foreground">
                                    Read only
                                </span>
                            )}
                        </article>
                    );
                })}
                {detail.dispatchItems.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No active manifest items are available for this stop.
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export function DriverPackingCommandDashboard({
    detail,
    onCompleted,
}: {
    detail: DriverStopDetail;
    onCompleted: () => void;
}) {
    const { params, setParams } = useDriverDashboardParams();
    const actions = useDriverDispatchActions();
    const dispatch = detail.dispatch;
    const order = detail.order;
    const customerName =
        order.customer?.businessName || order.customer?.name || "Customer";
    const address = formatAddress(detail.address);
    const phone = String(
        (detail.address as Record<string, unknown> | null)?.phoneNo ||
            order.customer?.phoneNo ||
            "",
    ).trim();
    const total = Math.max(0, Number(detail.summary.total || 0));
    const packed = Math.max(0, Number(detail.summary.packed || 0));
    const available = Math.max(0, Number(detail.summary.available || 0));
    const pending = Math.max(0, Number(detail.summary.pending || 0));
    const remaining = Math.max(0, total - packed);
    const packedPercent = total ? Math.round((packed / total) * 100) : 0;
    const lifecycle = detail.mobileLifecycle;
    const capabilities = lifecycle.capabilities;
    const stage = String(lifecycle.stage || "queue").toLowerCase();
    const inProgress = stage === "in progress";
    const complete = ["completed", "delivered"].includes(stage);
    const cancelled = ["cancelled", "canceled"].includes(stage);
    const inventoryBlocked =
        detail.dispatchReadiness.inventoryBlockingItems.length > 0;
    const canDispatch = capabilities.canStartTrip;
    const packingOpen = params.mode === "packing";
    const openPacking = () =>
        void setParams({ mode: "packing" }, DRIVER_STOP_URL_OPTIONS);
    const openHelp = () =>
        void setParams({ mode: "help" }, DRIVER_STOP_URL_OPTIONS);
    const primaryAction = getDriverPrimaryAction({
        stage,
        packed,
        total,
        canEditPacking: capabilities.canEditPacking,
        canStartTrip: capabilities.canStartTrip,
        canComplete: capabilities.canComplete,
        startTripBlockers: lifecycle.blockers.startTrip,
        packingBlockers: lifecycle.blockers.packing,
        readinessState: detail.dispatchReadiness.state,
    });
    const dispatchState = cancelled
        ? { value: "Cancelled", note: "Stop closed" }
        : complete
        ? { value: "Completed", note: "Proof saved" }
        : inProgress
          ? { value: "In progress", note: "Complete with proof" }
          : canDispatch
            ? { value: "Ready to load", note: "All gates passed" }
            : remaining === 0 && total > 0
              ? { value: "Packing complete", note: "Departure blocked" }
              : { value: "Packing", note: "Departure blocked" };
    const loadNote = cancelled
        ? "Stop cancelled"
        : complete
        ? "Delivered"
        : inProgress
          ? "Trip in progress"
          : canDispatch
            ? "Ready for departure"
            : remaining > 0
              ? "Finish packing"
              : inventoryBlocked
                ? "Inventory verification pending"
                : "Departure review required";
    const startTrip = async () => {
        if (!dispatch) return;
        try {
            await actions.onStartTrip({
                dispatchId: dispatch.id,
                salesId: order.id,
            });
            toast.success("Trip started.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Unable to start this trip.",
            );
        }
    };

    return (
        <div className="relative min-h-0 flex-1 overflow-y-auto bg-emerald-950/[0.025]">
            <div className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 sm:pb-8 lg:px-8">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                            Stop packing dashboard
                        </p>
                        <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                            {customerName}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Order {order.orderId} ·{" "}
                            {formatDeliveryTime(dispatch?.dueDate)}
                        </p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                        <Button variant="outline" onClick={onCompleted}>
                            Back to route
                        </Button>
                        {primaryAction.kind === "proof" ? (
                            <Button
                                onClick={() =>
                                    void setParams(
                                        { mode: "proof" },
                                        DRIVER_STOP_URL_OPTIONS,
                                    )
                                }
                            >
                                <CheckCircle2 className="mr-2 size-4" />{" "}
                                Complete with proof
                            </Button>
                        ) : primaryAction.kind === "start" ? (
                            <Button
                                disabled={actions.startTrip.isPending}
                                onClick={startTrip}
                                className="bg-emerald-700 text-white hover:bg-emerald-800"
                            >
                                <Truck className="mr-2 size-4" />
                                {actions.startTrip.isPending
                                    ? "Starting trip…"
                                    : "Start trip"}
                            </Button>
                        ) : primaryAction.kind === "pack" ? (
                            <Button
                                onClick={openPacking}
                                className="bg-emerald-700 text-white hover:bg-emerald-800"
                            >
                                Pack items
                            </Button>
                        ) : primaryAction.kind === "blocked" ? (
                            <Button
                                variant="outline"
                                disabled={!capabilities.canReportException}
                                onClick={
                                    capabilities.canReportException
                                        ? openHelp
                                        : undefined
                                }
                            >
                                <CircleHelp className="mr-2 size-4" />
                                {primaryAction.label}
                            </Button>
                        ) : primaryAction.kind === "cancelled" ? (
                            <Button variant="secondary" disabled>
                                {primaryAction.label}
                            </Button>
                        ) : null}
                    </div>
                </section>

                {complete ? (
                    <section className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                        <div>
                            <h2 className="font-semibold">
                                Delivery completed
                            </h2>
                            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                                Recipient acknowledgement and proof of delivery
                                were saved.
                            </p>
                        </div>
                    </section>
                ) : null}

                <section
                    aria-label="Stop packing summary"
                    className="mt-5 flex overflow-x-auto rounded-xl border bg-card shadow-sm"
                >
                    <CommandMetric
                        label="Packing progress"
                        value={`${packedPercent}%`}
                        note={`${packed} of ${total} packed`}
                        tone="success"
                    />
                    <CommandMetric
                        label="Available now"
                        value={String(complete ? 0 : available)}
                        note={
                            complete ? "Delivery closed" : `${pending} waiting`
                        }
                    />
                    <CommandMetric
                        label="Inventory"
                        value={inventoryBlocked ? "Review" : "Verified"}
                        note={`Revision ${detail.manifestRevision || "pending"}`}
                        tone={inventoryBlocked ? "warning" : "success"}
                    />
                    <CommandMetric
                        label="Dispatch state"
                        value={dispatchState.value}
                        note={dispatchState.note}
                        tone={
                            complete || inProgress || canDispatch
                                ? "success"
                                : "warning"
                        }
                    />
                    <CommandMetric
                        label="Load status"
                        value={`${packed} / ${total}`}
                        note={loadNote}
                    />
                </section>

                <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
                    <PackingList
                        detail={detail}
                        onPack={openPacking}
                        canEditPacking={capabilities.canEditPacking}
                        showPackAction={primaryAction.kind === "pack"}
                    />

                    <aside className="grid content-start gap-4">
                        <section className="rounded-xl border bg-card p-4 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                                Deliver to
                            </p>
                            <h2 className="mt-1 font-semibold">
                                {customerName}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {address || "Address review required"}
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    disabled={!phone}
                                    onClick={() =>
                                        window.open(`tel:${phone}`, "_blank")
                                    }
                                >
                                    <Phone className="mr-2 size-4" /> Call
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={!address}
                                    onClick={() =>
                                        window.open(
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
                                            "_blank",
                                            "noopener,noreferrer",
                                        )
                                    }
                                >
                                    <MapPin className="mr-2 size-4" /> Navigate
                                </Button>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                            <header className="border-b px-4 py-4">
                                <h2 className="font-semibold">Readiness</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Server-owned departure gates
                                </p>
                            </header>
                            <div className="divide-y px-4 text-sm">
                                <div className="flex items-center justify-between gap-3 py-3">
                                    <span className="text-muted-foreground">
                                        Packing
                                    </span>
                                    <strong>
                                        {remaining
                                            ? `${remaining} remaining`
                                            : "Complete"}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between gap-3 py-3">
                                    <span className="text-muted-foreground">
                                        Inventory
                                    </span>
                                    <strong>
                                        {inventoryBlocked
                                            ? "Review"
                                            : "Verified"}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between gap-3 py-3">
                                    <span className="text-muted-foreground">
                                        Destination
                                    </span>
                                    <strong>
                                        {address ? "Confirmed" : "Review"}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between gap-3 py-3">
                                    <span className="text-muted-foreground">
                                        Departure
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={
                                            canDispatch
                                                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                                : "border-amber-100 bg-amber-50 text-amber-700"
                                        }
                                    >
                                        {complete
                                            ? "Delivered"
                                            : inProgress
                                              ? "En route"
                                              : canDispatch
                                                ? "Ready"
                                                : "Blocked"}
                                    </Badge>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                            <header className="border-b px-4 py-4">
                                <h2 className="font-semibold">Stop activity</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Driver and warehouse events
                                </p>
                            </header>
                            <div className="divide-y px-4">
                                {[
                                    {
                                        Icon: PackageCheck,
                                        label: `Packing ${packed ? "started" : "pending"}`,
                                        note: `${packed} of ${total} units confirmed`,
                                    },
                                    {
                                        Icon: History,
                                        label: "Manifest refreshed",
                                        note: `Revision ${detail.manifestRevision || "pending"}`,
                                    },
                                ].map(({ Icon, label, note }) => (
                                    <div
                                        key={label}
                                        className="flex gap-3 py-3"
                                    >
                                        <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                            <Icon className="size-3.5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">
                                                {label}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {note}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-[auto_1fr] gap-2 border-t bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
                <Button
                    variant="outline"
                    aria-label="Back to route"
                    onClick={onCompleted}
                >
                    <Route className="size-4" />
                </Button>
                {primaryAction.kind === "proof" ? (
                    <Button
                        onClick={() =>
                            void setParams(
                                { mode: "proof" },
                                DRIVER_STOP_URL_OPTIONS,
                            )
                        }
                    >
                        <CheckCircle2 className="mr-2 size-4" /> Complete with
                        proof
                    </Button>
                ) : primaryAction.kind === "completed" ? (
                    <Button variant="secondary" disabled>
                        <CheckCircle2 className="mr-2 size-4" /> Delivery
                        completed
                    </Button>
                ) : primaryAction.kind === "cancelled" ? (
                    <Button variant="secondary" disabled>
                        {primaryAction.label}
                    </Button>
                ) : primaryAction.kind === "start" ? (
                    <Button
                        disabled={!dispatch || actions.startTrip.isPending}
                        onClick={startTrip}
                    >
                        <Truck className="mr-2 size-4" />
                        {actions.startTrip.isPending
                            ? "Starting trip…"
                            : "Start trip"}
                    </Button>
                ) : primaryAction.kind === "pack" ? (
                    <Button
                        onClick={openPacking}
                        className="bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                        <PackageCheck className="mr-2 size-4" /> Pack items
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        disabled={!capabilities.canReportException}
                        onClick={
                            capabilities.canReportException
                                ? openHelp
                                : undefined
                        }
                    >
                        <CircleHelp className="mr-2 size-4" />
                        {primaryAction.label}
                    </Button>
                )}
            </div>

            {!complete && capabilities.canReportException ? (
                <Button
                    variant="outline"
                    className="fixed bottom-5 right-5 z-10 hidden shadow-sm sm:flex"
                    onClick={() =>
                        void setParams(
                            { mode: "help" },
                            DRIVER_STOP_URL_OPTIONS,
                        )
                    }
                >
                    <CircleHelp className="mr-2 size-4" /> I need help
                </Button>
            ) : null}

            {packingOpen && dispatch ? (
                <DispatchPackingOverview
                    dispatchId={dispatch.id}
                    packItemsOpen
                    surface="driver"
                    onPackItemsOpenChange={(open) => {
                        if (!open) {
                            void setParams(
                                { mode: "details" },
                                DRIVER_STOP_URL_OPTIONS,
                            );
                        }
                    }}
                />
            ) : null}
        </div>
    );
}
