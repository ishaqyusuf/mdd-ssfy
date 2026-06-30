"use client";

import { useSalesInventoryConfiguratorPrompt } from "@/components/forms/sales-form/inventory-configurator-dialog";
import { SalesInboundStatusBadge } from "@/components/sales-inbound-status-badge";
import { SalesMenu } from "@/components/sales-menu";
import { SalesOverviewVersionMenuItems } from "@/components/sales-overview-version-menu-items";
import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { getSalesOrderLifecycleStatusBadgeClassName } from "@gnd/sales/order-status";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRef, useState } from "react";

export type SalesOrder = RouterOutputs["sales"]["getOrders"]["data"][number];

type Column = ColumnDef<SalesOrder>;

function baseInvoiceTotal(item: SalesOrder) {
    return item.baseInvoiceTotal ?? item.invoiceTotal;
}

function amountTone(item: SalesOrder) {
    if (item.amountDue === baseInvoiceTotal(item)) return "text-red-600";
    if (item.amountDue > 0) return "text-violet-600";
    return "text-emerald-600";
}

function paymentHint(item: SalesOrder) {
    if (item.amountDue === baseInvoiceTotal(item)) return "Unpaid";
    if (item.amountDue > 0)
        return `Due ${formatCurrency.format(item.amountDue)}`;
    return "Paid";
}

function DealerSaleBadge({ item }: { item: SalesOrder }) {
    if (!item.isDealerSale) return null;

    return (
        <Badge
            variant="outline"
            className="rounded-full border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-700"
        >
            Dealer
        </Badge>
    );
}

const selectColumn: Column = {
    id: "select",
    ...sizes.xs,
    enableResizing: false,
    enableHiding: false,
    enableSorting: false,
    meta: {
        sticky: true,
        skeleton: { type: "checkbox" },
        className: sizeClass(
            sizes.xs,
            "md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
        ),
        contentClassName: "flex items-center justify-center",
    },
    cell: ({ row }) => (
        <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => {
                if (checked === "indeterminate") {
                    row.toggleSelected();
                } else {
                    row.toggleSelected(checked);
                }
            }}
        />
    ),
};

const orderIdColumn: Column = {
    id: "orderId",
    header: "Order #",
    accessorKey: "orderId",
    ...sizes.md,
    enableResizing: true,
    meta: {
        sticky: true,
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Order #",
        sortField: "orderId",
        className: sizeClass(
            sizes.md,
            "md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
        ),
    },
    cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="truncate font-mono text-sm font-medium uppercase">
                {row.original.orderId}
            </span>
            <DealerSaleBadge item={row.original} />
            <SalesPriorityBadge priority={row.original.priority} />
            {row.original.salesRepInitial &&
            !row.original.orderId
                ?.toUpperCase()
                .endsWith(row.original.salesRepInitial) ? (
                <Badge
                    className="h-5 shrink-0 rounded-full px-1.5 text-[10px] font-semibold uppercase"
                    variant="secondary"
                >
                    {row.original.salesRepInitial}
                </Badge>
            ) : null}
            {row.original.noteCount ? (
                <Badge
                    className="h-5 shrink-0 gap-1 rounded-full px-1.5 text-[10px]"
                    variant="secondary"
                >
                    <Icons.StickyNote className="size-3" />
                    <span>{row.original.noteCount}</span>
                </Badge>
            ) : null}
        </div>
    ),
};

const statusColumn: Column = {
    id: "status",
    header: "Status",
    accessorKey: "status",
    ...sizes.md,
    enableResizing: true,
    meta: {
        skeleton: { type: "badge", width: "w-28" },
        headerLabel: "Status",
        sortField: "status",
        className: sizeClass(sizes.md),
    },
    cell: ({ row }) => (
        <Badge
            className={cn(
                "whitespace-nowrap border-0",
                getSalesOrderLifecycleStatusBadgeClassName(row.original.status),
            )}
        >
            {row.original.statusLabel}
        </Badge>
    ),
};

const salesDateColumn: Column = {
    id: "salesDate",
    header: "Date",
    accessorKey: "salesDate",
    ...sizes.sm,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-20" },
        headerLabel: "Date",
        sortField: "createdAt",
        className: sizeClass(sizes.sm),
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.salesDate}
        </span>
    ),
};

const customerColumn: Column = {
    id: "customerName",
    header: "Customer",
    accessorKey: "customerName",
    ...sizes.custom(180, 380, 240),
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-36" },
        headerLabel: "Customer",
        sortField: "customerName",
        className: sizeClass(sizes.custom(180, 380, 240)),
    },
    cell: ({ row }) => (
        <TextWithTooltip
            className="max-w-full truncate font-medium uppercase"
            text={row.original.customerName}
        />
    ),
};

const phoneColumn: Column = {
    id: "customerPhone",
    header: "Phone",
    accessorKey: "customerPhone",
    ...sizes.custom(120, 200, 150),
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Phone",
        className: sizeClass(sizes.custom(120, 200, 150)),
    },
    cell: ({ row }) => (
        <TextWithTooltip
            className="max-w-full truncate text-muted-foreground"
            text={row.original.customerPhone || "-"}
        />
    ),
};

const poColumn: Column = {
    id: "poNo",
    header: "P.O",
    accessorKey: "poNo",
    ...sizes.custom(90, 180, 120),
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-16" },
        headerLabel: "P.O",
        className: sizeClass(sizes.custom(90, 180, 120)),
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.poNo || "-"}
        </span>
    ),
};

const inboundColumn: Column = {
    id: "inboundStatus",
    header: "Inbound",
    accessorKey: "inboundStatus",
    ...sizes.custom(110, 180, 130),
    enableResizing: true,
    meta: {
        skeleton: { type: "badge", width: "w-24" },
        headerLabel: "Inbound",
        className: sizeClass(sizes.custom(110, 180, 130)),
    },
    cell: ({ row }) => (
        <SalesInboundStatusBadge status={row.original.inboundStatus} />
    ),
};

const invoiceTotalColumn: Column = {
    id: "invoiceTotal",
    header: "Invoice",
    accessorKey: "invoiceTotal",
    ...sizes.sm,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-16" },
        headerLabel: "Invoice",
        sortField: "grandTotal",
        className: sizeClass(sizes.sm, "text-right"),
    },
    cell: ({ row }) => <InvoiceCell item={row.original} />,
};

const amountDueColumn: Column = {
    id: "amountDue",
    header: "Balance",
    accessorKey: "amountDue",
    ...sizes.custom(110, 200, 140),
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-20" },
        headerLabel: "Balance",
        sortField: "amountDue",
        className: sizeClass(sizes.custom(110, 200, 140), "text-right"),
    },
    cell: ({ row }) => (
        <span className="block truncate text-right font-mono text-muted-foreground">
            {paymentHint(row.original)}
        </span>
    ),
};

const deliveryColumn: Column = {
    id: "deliveryOption",
    header: "Method",
    accessorKey: "deliveryOption",
    ...sizes.custom(100, 180, 130),
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-20" },
        headerLabel: "Method",
        className: sizeClass(sizes.custom(100, 180, 130)),
    },
    cell: ({ row }) => (
        <span className="truncate capitalize text-muted-foreground">
            {row.original.deliveryOption || "-"}
        </span>
    ),
};

const productionColumn: Column = {
    id: "productionLabel",
    header: "Production",
    accessorKey: "productionLabel",
    ...sizes.md,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Production",
        sortField: "prodStatus",
        className: sizeClass(sizes.md),
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.productionLabel}
        </span>
    ),
};

const fulfillmentColumn: Column = {
    id: "fulfillmentLabel",
    header: "Fulfillment",
    accessorKey: "fulfillmentLabel",
    ...sizes.md,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Fulfillment",
        className: sizeClass(sizes.md),
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.fulfillmentLabel}
        </span>
    ),
};

const salesRepColumn: Column = {
    id: "salesRepName",
    header: "Sales rep",
    accessorKey: "salesRepName",
    ...sizes.md,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Sales rep",
        sortField: "salesRepName",
        className: sizeClass(sizes.md),
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.salesRepName}
        </span>
    ),
};

const addressColumn: Column = {
    id: "address",
    header: "Address",
    accessorKey: "address",
    ...sizes.md,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-40" },
        headerLabel: "Address",
        className: sizeClass(sizes.md),
    },
    cell: ({ row }) => (
        <TextWithTooltip
            className="max-w-full truncate text-muted-foreground"
            text={row.original.address}
        />
    ),
};

const actionsColumn: Column = {
    id: "actions",
    header: "Actions",
    ...sizes.custom(144, 144),
    enableResizing: false,
    enableHiding: false,
    enableSorting: false,
    meta: {
        skeleton: { type: "icon" },
        headerLabel: "Actions",
        className: sizeClass(
            sizes.custom(144, 144),
            "md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
        ),
    },
    cell: ({ row }) => <ActionCell item={row.original} />,
};

export const columns: Column[] = [
    selectColumn,
    orderIdColumn,
    salesDateColumn,
    poColumn,
    inboundColumn,
    customerColumn,
    phoneColumn,
    addressColumn,
    invoiceTotalColumn,
    deliveryColumn,
    statusColumn,
    amountDueColumn,
    productionColumn,
    fulfillmentColumn,
    salesRepColumn,
    actionsColumn,
];

function InvoiceCell({ item }: { item: SalesOrder }) {
    const [opened, setOpened] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const pending = item.amountDue;
    const total = item.invoiceTotal;
    const baseTotal = baseInvoiceTotal(item);
    const ccc = item.displayCcc || 0;
    const paid = Math.max(baseTotal - pending, 0);
    const hasPendingBalance = pending > 0;

    if (!hasPendingBalance) {
        return (
            <span
                className={cn(
                    "block truncate text-right font-mono font-medium",
                    amountTone(item),
                )}
            >
                {formatCurrency.format(total)}
            </span>
        );
    }

    return (
        <div className="relative z-10 text-right">
            <SalesPaymentProcessor
                phoneNo={item.accountNo || item.customerPhone}
                selectedIds={[item.id]}
                customerId={item.customerId}
            >
                <button
                    ref={buttonRef}
                    type="button"
                    className="hidden"
                    onClick={(event) => event.stopPropagation()}
                />
            </SalesPaymentProcessor>
            <TooltipProvider delayDuration={70}>
                <Tooltip open={opened} onOpenChange={setOpened}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "block w-full truncate text-right font-mono font-medium",
                                amountTone(item),
                            )}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                        >
                            {formatCurrency.format(total)}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent
                        align="end"
                        side="left"
                        sideOffset={10}
                        className="relative z-[999] w-52 space-y-3 px-3 py-2 text-xs"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                    >
                        <div className="space-y-2">
                            <InvoiceBreakdownLine
                                label="Base Total"
                                value={baseTotal}
                            />
                            {ccc > 0 ? (
                                <InvoiceBreakdownLine
                                    label="C.C.C"
                                    value={ccc}
                                />
                            ) : null}
                            <InvoiceBreakdownLine
                                label="Pending"
                                value={pending}
                            />
                            <InvoiceBreakdownLine label="Paid" value={paid} />
                            <InvoiceBreakdownLine label="Total" value={total} />
                        </div>
                        <Button
                            className="w-full"
                            disabled={!item.due}
                            size="sm"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setOpened(false);
                                buttonRef.current?.click();
                            }}
                        >
                            Apply Payment
                        </Button>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

function InvoiceBreakdownLine({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-muted-foreground">{label}</span>
            <span className="font-mono font-medium">
                {formatCurrency.format(value)}
            </span>
        </div>
    );
}

function ActionCell({ item }: { item: SalesOrder }) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const overviewQuery = useSalesOverviewQuery();
    const { inventoryConfiguratorDialog, openSalesInventoryConfigurator } =
        useSalesInventoryConfiguratorPrompt();

    return (
        <>
            {inventoryConfiguratorDialog}
            <div className="relative z-10 flex items-center justify-end gap-1">
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <Link
                        href={`/sales-book/edit-order/${item.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Edit"
                        aria-label={`Edit ${item.orderId || item.slug}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Icons.Edit className="size-4" />
                        <span className="sr-only">Edit order</span>
                    </Link>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={(event) => {
                        event.stopPropagation();
                        overviewQuery.open2(item.uuid, "sales");
                    }}
                >
                    <Icons.ArrowUpRight className="size-4" />
                    <span className="sr-only">Open order</span>
                </Button>
                <SalesMenu
                    id={item.id}
                    slug={item.slug}
                    type="order"
                    orderNo={item.orderId}
                    customerEmail={item.email}
                    customerName={item.customerName}
                    trigger={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <Icons.MoreHoriz className="size-4" />
                            <span className="sr-only">More order actions</span>
                        </Button>
                    }
                    contentClassName="min-w-56"
                >
                    <SalesOverviewVersionMenuItems
                        type="order"
                        uuid={item.uuid}
                    />
                    <SalesMenu.Item
                        disabled={!item.id}
                        onSelect={() => {
                            void openSalesInventoryConfigurator(item.id);
                        }}
                    >
                        <Icons.PackageOpen className="mr-2 size-4 text-muted-foreground/70" />
                        Inventory
                    </SalesMenu.Item>
                    <SalesMenu.Separator />
                    <SalesMenu.SalesEmailMenuItems />
                    <SalesMenu.MarkAs />
                    <SalesMenu.SalesPrintMenuItems />
                    <SalesMenu.Copy />
                    <SalesMenu.Move />
                    <SalesMenu.Separator />
                    <SalesMenu.Delete
                        onDeleted={async () => {
                            await Promise.all([
                                queryClient.invalidateQueries({
                                    queryKey:
                                        trpc.sales.getOrders.infiniteQueryKey(),
                                }),
                                queryClient.invalidateQueries({
                                    queryKey:
                                        trpc.sales.getOrdersSummary.queryKey(),
                                }),
                            ]);
                        }}
                    />
                </SalesMenu>
            </div>
        </>
    );
}
