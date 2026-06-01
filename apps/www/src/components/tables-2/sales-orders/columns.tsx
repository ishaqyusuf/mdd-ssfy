"use client";

import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { getSalesOrderLifecycleStatusBadgeClassName } from "@gnd/sales/order-status";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { HoverCard } from "@gnd/ui/namespace";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesOrder = RouterOutputs["sales"]["getOrdersV2"]["data"][number];

type Column = ColumnDef<SalesOrder>;

function amountTone(item: SalesOrder) {
    if (item.amountDue === item.invoiceTotal) return "text-red-600";
    if (item.amountDue > 0) return "text-violet-600";
    return "text-emerald-600";
}

function paymentHint(item: SalesOrder) {
    if (item.amountDue === item.invoiceTotal) return "Unpaid";
    if (item.amountDue > 0)
        return `Due ${formatCurrency.format(item.amountDue)}`;
    return "Paid";
}

const selectColumn: Column = {
    id: "select",
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
    enableHiding: false,
    enableSorting: false,
    meta: {
        sticky: true,
        skeleton: { type: "checkbox" },
        className:
            "w-[50px] min-w-[50px] md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
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
    size: 180,
    minSize: 150,
    maxSize: 260,
    enableResizing: true,
    meta: {
        sticky: true,
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Order #",
        sortField: "orderId",
        className:
            "w-[180px] min-w-[150px] md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
    },
    cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-sm font-medium uppercase">
                {row.original.orderId}
            </span>
            <SalesPriorityBadge priority={row.original.priority} />
        </div>
    ),
};

const statusColumn: Column = {
    id: "status",
    header: "Status",
    accessorKey: "status",
    size: 160,
    minSize: 130,
    maxSize: 240,
    enableResizing: true,
    meta: {
        skeleton: { type: "badge", width: "w-28" },
        headerLabel: "Status",
        sortField: "status",
        className: "w-[160px] min-w-[130px]",
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
    size: 120,
    minSize: 100,
    maxSize: 180,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-20" },
        headerLabel: "Date",
        sortField: "createdAt",
        className: "w-[120px] min-w-[100px]",
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
    size: 240,
    minSize: 180,
    maxSize: 380,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-36" },
        headerLabel: "Customer",
        sortField: "customerName",
        className: "w-[240px] min-w-[180px]",
    },
    cell: ({ row }) => (
        <span className="truncate font-medium uppercase">
            {row.original.customerName}
        </span>
    ),
};

const phoneColumn: Column = {
    id: "customerPhone",
    header: "Phone",
    accessorKey: "customerPhone",
    size: 150,
    minSize: 120,
    maxSize: 200,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Phone",
        className: "w-[150px] min-w-[120px]",
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.customerPhone || "-"}
        </span>
    ),
};

const poColumn: Column = {
    id: "poNo",
    header: "P.O",
    accessorKey: "poNo",
    size: 120,
    minSize: 90,
    maxSize: 180,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-16" },
        headerLabel: "P.O",
        className: "w-[120px] min-w-[90px]",
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.poNo || "-"}
        </span>
    ),
};

const invoiceTotalColumn: Column = {
    id: "invoiceTotal",
    header: "Invoice",
    accessorKey: "invoiceTotal",
    size: 140,
    minSize: 110,
    maxSize: 200,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-20" },
        headerLabel: "Invoice",
        sortField: "grandTotal",
        className: "w-[140px] min-w-[110px] text-right",
    },
    cell: ({ row }) => (
        <span
            className={cn(
                "block truncate text-right font-mono font-medium",
                amountTone(row.original),
            )}
        >
            {formatCurrency.format(row.original.invoiceTotal)}
        </span>
    ),
};

const amountDueColumn: Column = {
    id: "amountDue",
    header: "Balance",
    accessorKey: "amountDue",
    size: 140,
    minSize: 110,
    maxSize: 200,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-20" },
        headerLabel: "Balance",
        sortField: "amountDue",
        className: "w-[140px] min-w-[110px] text-right",
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
    size: 130,
    minSize: 100,
    maxSize: 180,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-20" },
        headerLabel: "Method",
        className: "w-[130px] min-w-[100px]",
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
    size: 160,
    minSize: 130,
    maxSize: 240,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Production",
        sortField: "prodStatus",
        className: "w-[160px] min-w-[130px]",
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
    size: 160,
    minSize: 130,
    maxSize: 240,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Fulfillment",
        className: "w-[160px] min-w-[130px]",
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
    size: 160,
    minSize: 130,
    maxSize: 240,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-24" },
        headerLabel: "Sales rep",
        sortField: "salesRepName",
        className: "w-[160px] min-w-[130px]",
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
    size: 260,
    minSize: 180,
    maxSize: 420,
    enableResizing: true,
    meta: {
        skeleton: { type: "text", width: "w-40" },
        headerLabel: "Address",
        className: "w-[260px] min-w-[180px]",
    },
    cell: ({ row }) => (
        <span className="truncate text-muted-foreground">
            {row.original.address}
        </span>
    ),
};

const actionsColumn: Column = {
    id: "actions",
    header: "Actions",
    size: 96,
    minSize: 96,
    maxSize: 96,
    enableResizing: false,
    enableHiding: false,
    enableSorting: false,
    meta: {
        skeleton: { type: "icon" },
        headerLabel: "Actions",
        className:
            "w-[96px] min-w-[96px] md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
    },
    cell: ({ row }) => <ActionCell item={row.original} />,
};

export const columns: Column[] = [
    selectColumn,
    orderIdColumn,
    statusColumn,
    salesDateColumn,
    customerColumn,
    phoneColumn,
    poColumn,
    invoiceTotalColumn,
    amountDueColumn,
    deliveryColumn,
    productionColumn,
    fulfillmentColumn,
    salesRepColumn,
    addressColumn,
    actionsColumn,
];

function ActionCell({ item }: { item: SalesOrder }) {
    const overviewQuery = useSalesOverviewQuery();

    return (
        <div className="relative z-10 flex items-center justify-end gap-1">
            <HoverCard.Root openDelay={120} closeDelay={80}>
                <HoverCard.Trigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Icons.Eye className="size-4" />
                        <span className="sr-only">Preview order</span>
                    </Button>
                </HoverCard.Trigger>
                <HoverCard.Content
                    align="end"
                    side="left"
                    sideOffset={10}
                    className="w-[300px] rounded-md border border-border bg-background p-4 shadow-xl"
                >
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                    {item.customerName}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.orderId}
                                </p>
                            </div>
                            <Badge
                                className={cn(
                                    "whitespace-nowrap border-0",
                                    getSalesOrderLifecycleStatusBadgeClassName(
                                        item.status,
                                    ),
                                )}
                            >
                                {item.statusLabel}
                            </Badge>
                        </div>

                        <div className="space-y-2.5 text-sm">
                            <OverviewLine
                                label="Amount"
                                value={formatCurrency.format(item.invoiceTotal)}
                                valueClassName={amountTone(item)}
                            />
                            <OverviewLine
                                label="Payment"
                                value={paymentHint(item)}
                            />
                            <OverviewLine
                                label="Phone"
                                value={item.customerPhone || "-"}
                            />
                            <OverviewLine
                                label="Sales rep"
                                value={item.salesRepName}
                            />
                            <OverviewLine
                                label="Production"
                                value={item.productionLabel}
                            />
                            <OverviewLine
                                label="Fulfillment"
                                value={item.fulfillmentLabel}
                            />
                        </div>

                        <div className="border-t border-border pt-3">
                            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {item.address}
                            </p>
                        </div>
                    </div>
                </HoverCard.Content>
            </HoverCard.Root>

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
        </div>
    );
}

function OverviewLine({
    label,
    value,
    valueClassName,
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {label}
            </span>
            <span
                className={cn(
                    "truncate text-right font-medium",
                    valueClassName,
                )}
            >
                {value}
            </span>
        </div>
    );
}
