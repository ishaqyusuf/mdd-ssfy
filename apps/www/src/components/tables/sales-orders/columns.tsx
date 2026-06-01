"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/types/type";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import * as React from "react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { buttonVariants } from "@gnd/ui/button";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Icons } from "@gnd/ui/icons";
import { Item } from "@gnd/ui/namespace";
import { InvoiceColumn } from "./column.invoice";

import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { getSalesOrderLifecycleStatusInfo } from "@gnd/sales/order-status";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
    parseAsInteger,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";
import { usePathname } from "next/navigation";

const SalesOrderMoreActionsMenu = dynamic(() =>
    import("./row-actions-menu").then((mod) => mod.SalesOrderMoreActionsMenu),
);
const SalesOrderRestoreAction = dynamic(() =>
    import("./row-actions-menu").then((mod) => mod.SalesOrderRestoreAction),
);
export type SalesOrderItem = RouterOutputs["sales"]["index"]["data"][number];
export type Item = SalesOrderItem;
interface ItemProps {
    item: SalesOrderItem;
}

type LifecycleQtySnapshot = {
    total?: number | string | null;
    qty?: number | string | null;
};

type SalesOrderLifecycleSource = SalesOrderItem & {
    control?: {
        productionStatus?: string | null;
        dispatchStatus?: string | null;
        packed?: LifecycleQtySnapshot | null;
        pendingPacking?: LifecycleQtySnapshot | null;
        pendingDispatch?: LifecycleQtySnapshot | null;
        packables?: LifecycleQtySnapshot | null;
    };
    statistic?: {
        packed?: LifecycleQtySnapshot | null;
        pendingPacking?: LifecycleQtySnapshot | null;
        pendingDispatch?: LifecycleQtySnapshot | null;
        packables?: LifecycleQtySnapshot | null;
    };
};

function SalesOrderPreviewAction({ item }: ItemProps) {
    const requestRef = React.useRef(0);
    const [, setParams] = useQueryStates({
        salesPreviewId: parseAsInteger,
        salesPreviewCustomerEmail: parseAsString,
        salesPreviewCustomerName: parseAsString,
        salesPreviewError: parseAsString,
        salesPreviewRequest: parseAsString,
        salesPreviewUrl: parseAsString,
        salesPreviewType: parseAsStringEnum(["order", "quote"]),
        previewMode: parseAsStringEnum(["order"]),
        dispatchId: parseAsInteger,
    });

    const preview = async () => {
        if (!item.id) return;

        requestRef.current += 1;
        const requestId = `${Date.now()}-${requestRef.current}`;

        setParams({
            salesPreviewId: item.id,
            salesPreviewCustomerEmail: item.email ?? null,
            salesPreviewCustomerName: item.displayName ?? null,
            salesPreviewType: "order",
            salesPreviewRequest: requestId,
            salesPreviewUrl: null,
            salesPreviewError: null,
            previewMode: "order",
            dispatchId: null,
        });

        try {
            const { prepareSalesHtmlPreview } =
                await import("@/modules/sales-print/application/sales-print-service");
            const previewUrl = await prepareSalesHtmlPreview({
                salesIds: [item.id],
                mode: "order",
                dispatchId: null,
            });

            if (!isCurrentPreviewRequest(requestId)) return;

            setParams({
                salesPreviewUrl: previewUrl,
                salesPreviewError: null,
            });
        } catch {
            if (!isCurrentPreviewRequest(requestId)) return;

            setParams({
                salesPreviewError: "Unable to prepare this preview.",
            });
        }
    };

    return (
        <Button
            type="button"
            size="xs"
            variant="outline"
            title="Preview"
            aria-label={`Preview ${item.orderId || item.slug}`}
            onClick={() => {
                void preview();
            }}
        >
            <Icons.Eye className="size-4" />
        </Button>
    );
}

function isCurrentPreviewRequest(requestId: string) {
    if (typeof window === "undefined") return true;

    return (
        new URLSearchParams(window.location.search).get(
            "salesPreviewRequest",
        ) === requestId
    );
}

function getLifecycleStatusInfo(item: SalesOrderItem) {
    const source = item as SalesOrderLifecycleSource;
    const control = source.control;
    const statistic = source.statistic;
    const productionStatus =
        control?.productionStatus && control.productionStatus !== "unknown"
            ? control.productionStatus
            : item.status?.production?.status;
    const assignmentStatus = item.status?.assignment?.status;
    const legacyProductionStatus =
        assignmentStatus === "in progress" || assignmentStatus === "completed"
            ? "assigned"
            : undefined;
    const fulfillmentStatus =
        control?.dispatchStatus && control.dispatchStatus !== "unknown"
            ? control.dispatchStatus
            : item?.deliveryStatus || item.status?.delivery?.status;

    return getSalesOrderLifecycleStatusInfo({
        productionStatus,
        legacyProductionStatus,
        fulfillmentStatus,
        hasProductionWork: productionStatus === "N/A" ? false : undefined,
        packed: control?.packed || statistic?.packed,
        pendingPacking: control?.pendingPacking || statistic?.pendingPacking,
        pendingDispatch: control?.pendingDispatch || statistic?.pendingDispatch,
        packables: control?.packables || statistic?.packables,
    });
}

// Previous separate production/fulfillment status helpers. Keep these close to
// the unified lifecycle helper so the old two-column feature can be restored.
// function getProductionStatusLabel(item: SalesOrderItem) {
// 	const status = (item as any)?.control?.productionStatus;
// 	if (status && status !== "unknown") return status;
// 	return item.status.production?.scoreStatus || item.status.production?.status;
// }
//
// function getFulfillmentStatusLabel(item: SalesOrderItem) {
// 	const status = (item as any)?.control?.dispatchStatus;
// 	if (status && status !== "unknown") return status;
// 	return item?.deliveryStatus || "-";
// }

function normalizeInboundStatus(status?: string | null) {
    const value = String(status || "")
        .trim()
        .toUpperCase();
    if (
        value === "AVAILABLE" ||
        value === "ORDERED" ||
        value === "PENDING ORDER"
    ) {
        return value;
    }
    return null;
}

function getInboundToneClass(status?: string | null) {
    switch (normalizeInboundStatus(status)) {
        case "AVAILABLE":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "ORDERED":
            return "border-blue-200 bg-blue-50 text-blue-700";
        case "PENDING ORDER":
            return "border-amber-300 bg-amber-50 text-amber-800";
        default:
            return "border-slate-200 bg-slate-50 text-slate-600";
    }
}

export function salesInboundRowClassName(status?: string | null) {
    return normalizeInboundStatus(status) === "PENDING ORDER"
        ? "bg-amber-50/60 hover:bg-amber-100/70"
        : "";
}

function SalesInboundBadge({ item }: { item: SalesOrderItem }) {
    const status = normalizeInboundStatus((item as any).inboundStatus);
    if (!status) return <span className="text-muted-foreground">-</span>;

    return (
        <Badge
            variant="outline"
            className={cn(
                "rounded-full text-[11px] font-semibold uppercase whitespace-nowrap",
                getInboundToneClass(status),
            )}
        >
            {status}
        </Badge>
    );
}

function DealerSaleBadge({ item }: { item: SalesOrderItem }) {
    if (!(item as any).isDealerSale) return null;

    return (
        <Badge
            variant="outline"
            className="rounded-full border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-700"
        >
            Dealer
        </Badge>
    );
}

function CompactCustomerCell({ item }: { item: SalesOrderItem }) {
    return (
        <div className="max-w-[220px] xl:max-w-[300px]">
            <Item.Title
                className={cn(
                    "flex max-w-[220px] items-center gap-1 xl:max-w-[300px]",
                    item.isBusiness && "text-blue-700",
                )}
            >
                <TextWithTooltip
                    className="max-w-[120px] truncate xl:max-w-[160px]"
                    text={item.displayName || "-"}
                />
                <span className="font-normal text-muted-foreground">
                    {" - "}
                    {item.customerPhone || "-"}
                </span>
            </Item.Title>
            <Item.Description>
                <TextWithTooltip
                    className="min-w-max max-w-[220px] truncate"
                    text={item.address || "no address"}
                />
            </Item.Description>
        </div>
    );
}

const compactCustomerV2 = true;
const compactCustomer = false;

const compactCustomerColumnV2: ColumnDef<SalesOrderItem>[] = [
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <CompactCustomerCell item={item} />
        ),
    },
];

const legacyCustomerColumnsV2: ColumnDef<SalesOrderItem>[] = [
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <TCell.Primary
                className={cn(
                    item.isBusiness && "text-blue-700",
                    "whitespace-nowrap uppercase",
                )}
            >
                <TextWithTooltip
                    className="w-[100px] xl:w-[150px] max-w-none"
                    text={item.displayName || "-"}
                />
            </TCell.Primary>
        ),
    },
    {
        header: "Phone",
        accessorKey: "phone",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap">
                <TextWithTooltip
                    className="w-[110px]"
                    text={item?.customerPhone?.trim() || "-"}
                />
            </TCell.Secondary>
        ),
    },
    {
        header: "Address",
        accessorKey: "address",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary>
                <TextWithTooltip
                    className="w-[100px] xl:w-[120px] 2xl:w-[160px] max-w-none"
                    text={item?.address}
                />
            </TCell.Secondary>
        ),
    },
];

const compactCustomerColumn: ColumnDef<SalesOrderItem>[] = [
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <CompactCustomerCell item={item} />
        ),
    },
];

const legacyCustomerColumns: ColumnDef<SalesOrderItem>[] =
    legacyCustomerColumnsV2;

export const columns2: ColumnDef<SalesOrderItem>[] = [
    cells.selectColumn,
    {
        header: "Date",
        accessorKey: "salesDate",
        meta: {},
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono$">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Order #",
        accessorKey: "orderNo",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap inline-flex items-center gap-1">
                <span>{item.orderId}</span>
                <DealerSaleBadge item={item} />
                <SalesPriorityBadge priority={(item as any).priority} />
                {!item.orderId
                    ?.toUpperCase()
                    .endsWith(item.salesRepInitial) && (
                    <Badge className="font-mono$" variant="secondary">
                        {item.salesRepInitial}
                    </Badge>
                )}
                {!item.noteCount || (
                    <Badge className="p-1 h-5" variant="secondary">
                        <Icons.StickyNote className="w-3 mr-1" />
                        <span className="">{item.noteCount}</span>
                    </Badge>
                )}
            </TCell.Secondary>
        ),
    },
    {
        header: "P.O",
        accessorKey: "po",
        meta: {
            className: "",
        },
        cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
    },
    {
        header: "Inbound",
        accessorKey: "inboundStatus",
        cell: ({ row: { original: item } }) => (
            <SalesInboundBadge item={item} />
        ),
    },
    // Toggle this switch to restore the legacy separate Customer / Phone / Address columns.
    ...(compactCustomerV2 ? compactCustomerColumnV2 : legacyCustomerColumnsV2),
    {
        header: "Invoice",
        accessorKey: "invoice",
        meta: {
            className: "text-right",
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            return <InvoiceColumn item={item} />;
        },
    },
    {
        header: "Method",
        id: "deliveryMethod",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>
                {item?.deliveryOption || "Not set"}
            </Progress.Status>
        ),
    },
    {
        header: "Status",
        accessorKey: "lifecycleStatus",
        cell: ({ row: { original: item } }) => {
            const lifecycle = getLifecycleStatusInfo(item);

            return (
                <Badge
                    className={cn(
                        "border-0 whitespace-nowrap",
                        lifecycle.badgeClassName,
                    )}
                >
                    {lifecycle.label}
                </Badge>
            );
        },
    },
    // Previous two-column production/fulfillment display, replaced by the
    // unified lifecycle Status column above.
    // {
    // 	header: "Production",
    // 	accessorKey: "production",
    // 	cell: ({ row: { original: item } }) => (
    // 		<Progress>
    // 			<Progress.Status>{getProductionStatusLabel(item)}</Progress.Status>
    // 		</Progress>
    // 	),
    // },
    // {
    // 	header: "Fulfillment",
    // 	id: "fulfillmentStatus",
    // 	accessorKey: "dispatch",
    // 	cell: ({ row: { original: item } }) => (
    // 		<Progress.Status>{getFulfillmentStatusLabel(item)}</Progress.Status>
    // 	),
    // },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Actions item={item} />
            </>
        ),
    },
];
export const columns: ColumnDef<SalesOrderItem>[] = [
    cells.selectColumn,
    {
        header: "Date",
        accessorKey: "salesDate",
        meta: {},
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono$">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Order #",
        accessorKey: "orderNo",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap inline-flex items-center gap-1">
                <span>{item.orderId}</span>
                <DealerSaleBadge item={item} />
                <SalesPriorityBadge priority={(item as any).priority} />
                {!item.orderId
                    ?.toUpperCase()
                    .endsWith(item.salesRepInitial) && (
                    <Badge className="font-mono$" variant="secondary">
                        {item.salesRepInitial}
                    </Badge>
                )}
                {!item.noteCount || (
                    <Badge className="p-1 h-5" variant="secondary">
                        <Icons.StickyNote className="w-3 mr-1" />
                        <span className="">{item.noteCount}</span>
                    </Badge>
                )}
            </TCell.Secondary>
        ),
    },
    {
        header: "P.O",
        accessorKey: "po",
        meta: {
            className: "",
        },
        cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
    },
    {
        header: "Inbound",
        accessorKey: "inboundStatus",
        cell: ({ row: { original: item } }) => (
            <SalesInboundBadge item={item} />
        ),
    },
    // Toggle this switch to restore the legacy separate Customer / Phone / Address columns.
    ...(compactCustomer ? compactCustomerColumn : legacyCustomerColumns),
    // {
    //     header: "Invoice",
    //     accessorKey: "invoice",
    //     meta: {
    //         className: "text-right",
    //     },
    //     cell: ({ row: { original: item } }) => (
    //         <div className="text-right">
    //             <TCell.Money
    //                 value={item.invoice.total}
    //                 className={cn("font-mono$")}
    //             />
    //         </div>
    //     ),
    // },
    {
        header: "Invoice",
        accessorKey: "invoice",
        meta: {
            className: "text-right",
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            return <InvoiceColumn item={item} />;
        },
    },

    {
        header: "Method",
        id: "deliveryMethod",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>
                {item?.deliveryOption || "Not set"}
            </Progress.Status>
        ),
    },
    {
        header: "Status",
        accessorKey: "lifecycleStatus",
        cell: ({ row: { original: item } }) => {
            const lifecycle = getLifecycleStatusInfo(item);

            return (
                <Badge
                    className={cn(
                        "border-0 whitespace-nowrap",
                        lifecycle.badgeClassName,
                    )}
                >
                    {lifecycle.label}
                </Badge>
            );
        },
    },
    // Previous two-column production/fulfillment display, replaced by the
    // unified lifecycle Status column above.
    // {
    // 	header: "Production",
    // 	accessorKey: "production",
    // 	cell: ({ row: { original: item } }) => (
    // 		<Progress>
    // 			<Progress.Status>{getProductionStatusLabel(item)}</Progress.Status>
    // 		</Progress>
    // 	),
    // },
    // {
    // 	header: "Fulfillment",
    // 	id: "fulfillmentStatus",
    // 	accessorKey: "dispatch",
    // 	cell: ({ row: { original: item } }) => (
    // 		<Progress.Status>{getFulfillmentStatusLabel(item)}</Progress.Status>
    // 	),
    // },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "dt-action-cell",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Actions item={item} />
            </>
        ),
    },
];

function Actions({ item }: { item: SalesOrderItem }) {
    const pathname = usePathname();

    if (pathname.includes("bin")) {
        return <SalesOrderRestoreAction item={item} />;
    }

    return (
        <div className="relative flex items-center gap-2 z-10">
            <Link
                className={cn(
                    buttonVariants({
                        // variant: "ghost"
                        size: "xs",
                    }),
                    "bg-green-600/70 hover:bg-green-600 text-accent",
                )}
                href={`/sales-book/edit-order/${item.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Edit"
                aria-label={`Edit ${item.orderId || item.slug}`}
            >
                <Icons.Edit className="size-4" />
            </Link>
            <SalesOrderPreviewAction item={item} />
            <SalesOrderMoreActions item={item} />
        </div>
    );
}

function SalesOrderMoreActions({ item }: { item: SalesOrderItem }) {
    const [open, setOpen] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);

    if (loaded) {
        return (
            <SalesOrderMoreActionsMenu
                item={item}
                open={open}
                onOpenChange={setOpen}
            />
        );
    }

    return (
        <Button
            size="xs"
            variant="outline"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setLoaded(true);
                setOpen(true);
            }}
        >
            <Icons.MoreHoriz className="size-4 text-muted-foreground" />
        </Button>
    );
}
export const mobileColumn: ColumnDef<SalesOrderItem>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
        },
        cell: ({ row: { original: item } }) => {
            return <ItemCard item={item} />;
        },
    },
];

function getInvoiceStatusLabel(item: SalesOrderItem) {
    if (item.invoice.pending <= 0) return "Paid";
    if (item.invoice.pending >= item.invoice.total) return "Unpaid";
    return "Part paid";
}

function getInvoiceToneClass(item: SalesOrderItem) {
    if (item.invoice.pending <= 0) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (item.invoice.pending >= item.invoice.total) {
        return "border-red-200 bg-red-50 text-red-700";
    }
    return "border-amber-200 bg-amber-50 text-amber-700";
}

// Previous mobile production/fulfillment status block, kept as a restore point
// for the old two-status mobile card layout.
// function MobileStatusBlock({
// 	label,
// 	value,
// 	icon: Icon,
// }: {
// 	label: string;
// 	value: string;
// 	icon: React.ComponentType<{ className?: string }>;
// }) {
// 	return (
// 		<div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5">
// 			<div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
// 				<Icon className="size-3.5 shrink-0" />
// 				<span className="truncate">{label}</span>
// 			</div>
// 			<div className="mt-1 truncate text-sm font-semibold capitalize text-foreground">
// 				{value || "-"}
// 			</div>
// 		</div>
// 	);
// }

function ItemCard({ item }: ItemProps) {
    const invoiceStatus = getInvoiceStatusLabel(item);
    const lifecycle = getLifecycleStatusInfo(item);
    // Previous separate mobile status values:
    // const productionStatus = getProductionStatusLabel(item) || "-";
    // const fulfillmentStatus = getFulfillmentStatusLabel(item) || "-";

    return (
        <div
            className={cn(
                "group flex w-full flex-col gap-3 rounded-3xl border border-border/70 bg-card p-4 text-left shadow-sm transition duration-200 active:scale-[0.995]",
                item.invoice.pending >= item.invoice.total &&
                    "border-red-200/80 bg-red-50/30",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Customer
                    </p>
                    <p
                        className={cn(
                            "mt-1 truncate text-xl font-semibold leading-6 text-foreground",
                            item.isBusiness && "text-blue-700",
                        )}
                    >
                        {item.displayName || "Unknown customer"}
                    </p>
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-muted px-2 py-1 font-mono text-[11px] font-semibold uppercase text-foreground">
                            {item.orderId || "-"}
                        </span>
                        <SalesPriorityBadge
                            priority={(item as any).priority}
                            className="px-2 py-1"
                        />
                        <DealerSaleBadge item={item} />
                        <SalesInboundBadge item={item} />
                        {!item.orderId
                            ?.toUpperCase()
                            .endsWith(item.salesRepInitial) && (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">
                                {item.salesRepInitial}
                            </span>
                        )}
                        {!item.noteCount || (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                <Icons.StickyNote className="mr-1 size-3" />
                                {item.noteCount}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-start gap-1.5">
                    <span
                        className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            getInvoiceToneClass(item),
                        )}
                    >
                        {invoiceStatus}
                    </span>
                    <div
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onKeyDown={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <Actions item={item} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                <div className="min-w-0 space-y-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                        <Icons.Calendar className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-foreground">
                            {item.salesDate || "No date"}
                        </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                        <Icons.Phone className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-muted-foreground">
                            {item.customerPhone || "No phone number"}
                        </span>
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                        <Icons.MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <TextWithTooltip
                            className="max-w-full truncate text-muted-foreground"
                            text={item.address || "No address available"}
                        />
                    </div>
                </div>

                <div className="min-w-[92px] text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Invoice
                    </p>
                    <TCell.Money
                        value={item.invoice.total}
                        className={cn(
                            "mt-1 block text-base font-semibold",
                            item.invoice.pending === item.invoice.total
                                ? "text-red-600"
                                : item.invoice.pending > 0
                                  ? "text-amber-600"
                                  : "text-emerald-600",
                        )}
                    />
                    {item.poNo ? (
                        <p className="mt-1 max-w-[110px] truncate text-[11px] text-muted-foreground">
                            PO {item.poNo}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
                <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <Icons.Package2 className="size-3.5 shrink-0" />
                        <span className="truncate">Status</span>
                    </div>
                    <div className="mt-1">
                        <Badge
                            className={cn(
                                "border-0 whitespace-nowrap",
                                lifecycle.badgeClassName,
                            )}
                        >
                            {lifecycle.label}
                        </Badge>
                    </div>
                </div>
            </div>
            {/*
			Previous two-block mobile production/fulfillment display, replaced by
			the unified lifecycle Status block above.

			<div className="grid grid-cols-2 gap-2">
				<MobileStatusBlock
					label="Production"
					value={productionStatus}
					icon={Icons.Factory}
				/>
				<MobileStatusBlock
					label="Fulfillment"
					value={fulfillmentStatus}
					icon={Icons.Package2}
				/>
			</div>
			*/}

            <div className="flex items-center justify-between border-border/70 border-t pt-3 text-sm">
                <span className="text-muted-foreground">Open sales order</span>
                <Icons.ExternalLink className="size-4 text-muted-foreground transition group-hover:text-primary" />
            </div>
        </div>
    );
}
