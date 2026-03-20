"use client";

import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Badge } from "@gnd/ui/badge";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { SalesMenu } from "@/components/sales-menu";
import { SuperAdminGuard } from "@/components/auth-guard";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { ExternalLink } from "lucide-react";

export type Item = RouterOutputs["sales"]["quotes"]["data"][number];
export const columns: ColumnDef<Item>[] = [
    cells.selectColumn,
    {
        header: "Date",
        accessorKey: "quoteDate",
        meta: {},
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono$">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Quote #",
        accessorKey: "quoteId",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap">
                {item.orderId}
                {!item.orderId
                    ?.toUpperCase()
                    .endsWith(item.salesRepInitial) && (
                    <Badge className="font-mono$" variant="secondary">
                        {item.salesRepInitial}
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
    {
        header: "Invoice",
        accessorKey: "invoice",
        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Money
                    value={item.invoice.total}
                    className="font-mono$"
                />
            </div>
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
            <div className="flex gap-4">
                <QuoteActions item={item} />
            </div>
        ),
    },
];

function QuoteActions({ item }: { item: Item }) {
    const overviewOpen = useSalesOverviewOpen();

    return (
        <SalesMenu
            id={item.id}
            slug={item.slug}
            type="quote"
            trigger={
                <Button size="xs" variant="outline">
                    <Icons.MoreHoriz className="size-4 text-muted-foreground" />
                </Button>
            }
        >
            <SuperAdminGuard>
                <SalesMenu.Sub>
                    <SalesMenu.SubTrigger className="whitespace-nowrap">
                        <ExternalLink className="mr-2 size-4 text-muted-foreground/70" />
                        <span className="whitespace-nowrap">Open overview</span>
                        <span className="ml-auto rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            v2
                        </span>
                    </SalesMenu.SubTrigger>
                    <SalesMenu.SubContent>
                        <SalesMenu.Item
                            className="whitespace-nowrap"
                            onSelect={(e) => {
                                e.preventDefault();
                                overviewOpen.openQuoteSheet(item.uuid);
                            }}
                        >
                            Open v2 sheet
                        </SalesMenu.Item>
                        <SalesMenu.Item
                            className="whitespace-nowrap"
                            onSelect={(e) => {
                                e.preventDefault();
                                overviewOpen.openQuotePage(item.uuid);
                            }}
                        >
                            Open v2 page
                        </SalesMenu.Item>
                    </SalesMenu.SubContent>
                </SalesMenu.Sub>
            </SuperAdminGuard>
            <SalesMenu.QuoteEmailMenuItems />
            <SuperAdminGuard>
                <SalesMenu.PrintModes />
            </SuperAdminGuard>
            <SalesMenu.Copy />
            <SalesMenu.Move />
        </SalesMenu>
    );
}
