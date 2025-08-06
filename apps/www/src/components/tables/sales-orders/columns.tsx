"use client";

import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@/components/(clean-code)/menu";
import { Progress } from "@/components/(clean-code)/progress";
import { SalesPayWidget } from "@/components/widgets/sales-pay-widget";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@gnd/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";
import { StickyNote } from "lucide-react";
import { InvoiceColumn } from "./column.invoice";

export type Item = RouterOutputs["sales"]["index"]["data"][number];
export const columns: ColumnDef<Item>[] = [
    {
        header: "Date",
        accessorKey: "salesDate",
        meta: {},
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Order #",
        accessorKey: "order.no",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap inline-flex items-center gap-1">
                <span>{item.orderId}</span>
                {!item.orderId
                    ?.toUpperCase()
                    .endsWith(item.salesRepInitial) && (
                    <Badge className="font-mono" variant="secondary">
                        {item.salesRepInitial}
                    </Badge>
                )}
                {!item.noteCount || (
                    <Badge className="p-1 h-5" variant="secondary">
                        <StickyNote className="w-3 mr-1" />
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
                    className="max-w-[100px] xl:max-w-[200px]"
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
                    className="max-w-[85px] xl:max-w-[120px]"
                    text={item?.customerPhone || "-"}
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
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item?.address}
                />
            </TCell.Secondary>
        ),
    },
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
    //                 className={cn("font-mono")}
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
    // {
    //     header: "Pending",
    //     accessorKey: "pending",
    //     cell: ({ row: { original: item } }) => (
    //         <div>
    //             {item.invoice.pending ? (
    //                 <TCell.Money
    //                     value={Math.abs(item.invoice.pending || 0)}
    //                     className={cn(
    //                         "font-mono font-medium text-muted-foreground",
    //                         item.invoice.pending > 0 && "text-red-700/80",
    //                         item.invoice.pending < 0 &&
    //                             "bg-emerald-700 text-white",
    //                     )}
    //                 />
    //             ) : (
    //                 "-"
    //             )}
    //         </div>
    //     ),
    // },
    {
        header: "Method",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>
                {item?.deliveryOption || "Not set"}
            </Progress.Status>
        ),
    },
    {
        header: "Production",
        accessorKey: "production",
        cell: ({ row: { original: item } }) => (
            <Progress>
                <Progress.Status>
                    {item.status.production?.scoreStatus ||
                        item.status.production?.status}
                </Progress.Status>
            </Progress>
        ),
    },
    {
        header: "Fulfillment",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>{item?.deliveryStatus || "-"}</Progress.Status>
        ),
    },
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

function Actions({ item }: { item: Item }) {
    const produceable = !!item.stats?.prodCompleted?.total;
    const batchSales = useBatchSales();
    const isMobile = useIsMobile();
    return (
        <div className="relative z-10">
            <Menu
                triggerSize={isMobile ? "default" : "xs"}
                Trigger={
                    <Button
                        className={cn(isMobile || "size-4 p-0")}
                        variant="ghost"
                    >
                        <Icons.MoreHoriz className="" />
                    </Button>
                }
            >
                <Menu.Item
                    SubMenu={
                        <>
                            <Menu.Item
                                disabled={!produceable}
                                onClick={(e) => {
                                    e.preventDefault();
                                    batchSales.markAsProductionCompleted(
                                        item.id,
                                    );
                                }}
                            >
                                Production Complete
                            </Menu.Item>
                            <Menu.Item
                                onClick={(e) => {
                                    e.preventDefault();
                                    batchSales.markAsFulfilled(item.id);
                                }}
                            >
                                Fulfillment Complete
                            </Menu.Item>
                        </>
                    }
                >
                    Mark as
                </Menu.Item>
            </Menu>
        </div>
    );
}
export const mobileColumn: ColumnDef<Item>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
            // preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            return <ItemCard item={item} />;
        },
    },
];
function ItemCard({ item }: { item: Item }) {
    // design a mobile version of the columns here

    const overviewQuery = useSalesOverviewQuery();
    return (
        <div
            onClick={(e) => {
                e.preventDefault();
            }}
            className="flex flex-col space-y-2 p-3 border-b"
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <TCell.Secondary className="font-bold">
                            {item.orderId}
                        </TCell.Secondary>
                        {!item.orderId
                            ?.toUpperCase()
                            .endsWith(item.salesRepInitial) && (
                            <Badge
                                className="font-mono text-xs"
                                variant="secondary"
                            >
                                {item.salesRepInitial}
                            </Badge>
                        )}
                        {!item.noteCount || (
                            <Badge
                                className="p-1 h-5 text-xs"
                                variant="secondary"
                            >
                                <StickyNote className="w-3 mr-1" />
                                <span className="">{item.noteCount}</span>
                            </Badge>
                        )}
                    </div>
                    <TCell.Secondary className="text-xs font-mono">
                        {item?.salesDate}
                    </TCell.Secondary>
                </div>
                <Actions item={item} />
            </div>

            <div>
                <TCell.Primary
                    className={cn(
                        "font-semibold",
                        item.isBusiness && "text-blue-700",
                    )}
                >
                    <TextWithTooltip
                        className="max-w-full"
                        text={item.displayName || "-"}
                    />
                </TCell.Primary>
                {item.poNo && (
                    <TCell.Secondary className="text-xs">
                        P.O: {item.poNo}
                    </TCell.Secondary>
                )}
            </div>

            <div className="text-xs text-muted-foreground">
                <TextWithTooltip className="max-w-full" text={item?.address} />
                <div>{item?.customerPhone}</div>
            </div>

            <div className="flex justify-between items-center border-t pt-2 mt-2">
                <div>
                    <div className="text-xs text-muted-foreground">Invoice</div>
                    <TCell.Money
                        value={item.invoice.total}
                        className={cn(
                            "font-mono font-bold",
                            item.invoice.pending == item.invoice.total
                                ? "text-red-600"
                                : item.invoice.pending > 0
                                  ? "text-purple-500"
                                  : "text-green-600",
                        )}
                    />
                    {item.invoice.pending > 0 && (
                        <TCell.Secondary className="text-xs">
                            (Pending:{" "}
                            <TCell.Money
                                value={item.invoice.pending}
                                className="inline-block"
                            />
                            )
                        </TCell.Secondary>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground">Method</div>
                    <Progress.Status>
                        {item?.deliveryOption || "Not set"}
                    </Progress.Status>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <div className="text-muted-foreground">Production</div>
                    <Progress.Status>
                        {item.status.production?.scoreStatus ||
                            item.status.production?.status}
                    </Progress.Status>
                </div>
                <div>
                    <div className="text-muted-foreground">Fulfillment</div>
                    <Progress.Status>
                        {item?.deliveryStatus || "-"}
                    </Progress.Status>
                </div>
            </div>
        </div>
    );
}

