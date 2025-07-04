"use client";

import { ColumnDef } from "@/types/type";
import { ActionCell } from "../action-cell";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { Icons } from "@gnd/ui/icons";
import { Button } from "@gnd/ui/button";

export type Item = RouterOutputs["sales"]["inboundIndex"]["data"][number];
export const columns: ColumnDef<Item>[] = [
    {
        header: "Order",
        accessorKey: "order",
        cell: ({ row: { original: item } }) => (
            <div className="inline-flex gap-2 items-center">
                <TCell.Secondary className="font-mono">
                    {item?.orderId}
                </TCell.Secondary>
            </div>
        ),
    },
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <div className="inline-flex flex-col">
                <TCell.Primary className="uppercase">
                    {item?.customer?.businessName || item?.customer?.name}
                </TCell.Primary>
                <span className="uppercase">{item?.customer?.phoneNo}</span>
            </div>
        ),
    },
    {
        header: "Sales Rep",
        accessorKey: "salesRep",
        cell: ({ row: { original: item } }) => (
            <div className="inline-flex flex-col">
                <span className="uppercase">{item?.salesRep?.name}</span>
            </div>
        ),
    },
    {
        header: "Status",
        accessorKey: "status",
        cell: ({ row: { original: item } }) => (
            <div className="inline-flex flex-col">
                <Progress>
                    <Progress.Status>
                        {item?.inboundStatus || "N/A"}
                    </Progress.Status>
                </Progress>
            </div>
        ),
    },
    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return (
                <ActionCell itemId={item.id}>
                    <Action item={item} />
                </ActionCell>
            );
        },
    },
];
function Action({ item }: { item: Item }) {
    const { params, setParams } = useInboundStatusModal();
    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => {
                    setParams({
                        inboundOrderId: item.id,
                        inboundOrderNo: item.orderId,
                    });
                }}
            >
                <Icons.Edit className="h-4 w-4" />
            </Button>
        </>
    );
}
