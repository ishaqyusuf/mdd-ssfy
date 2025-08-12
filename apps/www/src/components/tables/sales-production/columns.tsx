"use client";

import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@/components/(clean-code)/menu";
import { Progress } from "@/components/(clean-code)/progress";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export type Item = RouterOutputs["sales"]["productions"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const dueDateColumn: Column = {
    header: "Due Date",
    accessorKey: "salesDate",
    meta: {},
    cell: ({ row: { original: item } }) => <Date item={item} />,
};
const assignedToColumn: Column = {
    header: "Assigned To",
    accessorKey: "assignedTo",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <TCell.Primary className="flex gap-4 font-mono">
            {item.assignedTo}
        </TCell.Primary>
    ),
};
const customerColumn: Column = {
    header: "Customer",
    accessorKey: "Customer",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <TCell.Primary>{item.customer}</TCell.Primary>
    ),
};
const salesRepColumn: Column = {
    header: "Sales Rep",
    accessorKey: "Sales Rep",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <TCell.Primary className="whitespace-nowrap uppercase">
            <TextWithTooltip className="max-w-[85px]" text={item.salesRep} />
        </TCell.Primary>
    ),
};
const orderColumn: Column = {
    header: "Order #",
    accessorKey: "orderId",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <TCell.Primary className="font-mono">{item.orderId}</TCell.Primary>
    ),
};
const statusColumn: Column = {
    header: "Status",
    accessorKey: "statusColumn",
    meta: {},
    cell: ({ row: { original: item } }) => {
        const production = item.status?.production;
        return (
            <Progress>
                <Progress.Status>
                    {production?.scoreStatus || production?.status}
                </Progress.Status>
            </Progress>
        );
    },
};
export const columns: Column[] = [
    dueDateColumn,
    assignedToColumn,
    customerColumn,
    orderColumn,
    salesRepColumn,
    statusColumn,
];

export const workerColumns: ColumnDef<Item>[] = [
    dueDateColumn,
    assignedToColumn,
    customerColumn,
    orderColumn,
    salesRepColumn,
    statusColumn,
];
function Date({ item }: ItemProps) {
    return (
        <>
            <TCell.Primary className="font-mono">
                {item.alert.date ? (
                    <TCell.Date>{item.alert.date}</TCell.Date>
                ) : (
                    <>N/A</>
                )}
            </TCell.Primary>
            <TCell.Secondary className="flex gap-4 font-mono">
                {item.completed ? (
                    <></>
                ) : (
                    <TCell.Status noDot status={item.alert.text} />
                )}
            </TCell.Secondary>
        </>
    );
}
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
// export const mobileColumn: ColumnDef<Item>[] = [
//     {
//         header: "",
//         accessorKey: "row",
//         meta: {
//             className: "flex-1 p-0",
//             // preventDefault: true,
//         },
//         cell: ({ row: { original: item } }) => {
//             return <ItemCard item={item} />;
//         },
//     },
// ];
// function ItemCard({ item }: { item: Item }) {
//     // design a mobile version of the columns here

//     const overviewQuery = useSalesOverviewQuery();
//     return (
//         <div
//             onClick={(e) => {
//                 e.preventDefault();
//             }}
//             className="flex flex-col space-y-2 p-3 border-b"
//         >
//             <div className="flex justify-between items-start">
//                 <div className="flex flex-col">
//                     <div className="flex items-center gap-2">
//                         <TCell.Secondary className="font-bold">
//                             {item.orderId}
//                         </TCell.Secondary>
//                         {!item.orderId
//                             ?.toUpperCase()
//                             .endsWith(item.salesRepInitial) && (
//                             <Badge
//                                 className="font-mono text-xs"
//                                 variant="secondary"
//                             >
//                                 {item.salesRepInitial}
//                             </Badge>
//                         )}
//                         {!item.noteCount || (
//                             <Badge
//                                 className="p-1 h-5 text-xs"
//                                 variant="secondary"
//                             >
//                                 <StickyNote className="w-3 mr-1" />
//                                 <span className="">{item.noteCount}</span>
//                             </Badge>
//                         )}
//                     </div>
//                     <TCell.Secondary className="text-xs font-mono">
//                         {item?.salesDate}
//                     </TCell.Secondary>
//                 </div>
//                 <Actions item={item} />
//             </div>

//             <div>
//                 <TCell.Primary
//                     className={cn(
//                         "font-semibold",
//                         item.isBusiness && "text-blue-700",
//                     )}
//                 >
//                     <TextWithTooltip
//                         className="max-w-full"
//                         text={item.displayName || "-"}
//                     />
//                 </TCell.Primary>
//                 {item.poNo && (
//                     <TCell.Secondary className="text-xs">
//                         P.O: {item.poNo}
//                     </TCell.Secondary>
//                 )}
//             </div>

//             <div className="text-xs text-muted-foreground">
//                 <TextWithTooltip className="max-w-full" text={item?.address} />
//                 <div>{item?.customerPhone}</div>
//             </div>

//             <div className="flex justify-between items-center border-t pt-2 mt-2">
//                 <div>
//                     <div className="text-xs text-muted-foreground">Invoice</div>
//                     <TCell.Money
//                         value={item.invoice.total}
//                         className={cn(
//                             "font-mono font-bold",
//                             item.invoice.pending == item.invoice.total
//                                 ? "text-red-600"
//                                 : item.invoice.pending > 0
//                                   ? "text-purple-500"
//                                   : "text-green-600",
//                         )}
//                     />
//                     {item.invoice.pending > 0 && (
//                         <TCell.Secondary className="text-xs">
//                             (Pending:{" "}
//                             <TCell.Money
//                                 value={item.invoice.pending}
//                                 className="inline-block"
//                             />
//                             )
//                         </TCell.Secondary>
//                     )}
//                 </div>
//                 <div className="text-right">
//                     <div className="text-xs text-muted-foreground">Method</div>
//                     <Progress.Status>
//                         {item?.deliveryOption || "Not set"}
//                     </Progress.Status>
//                 </div>
//             </div>

//             <div className="grid grid-cols-2 gap-2 text-xs">
//                 <div>
//                     <div className="text-muted-foreground">Production</div>
//                     <Progress.Status>
//                         {item.status.production?.scoreStatus ||
//                             item.status.production?.status}
//                     </Progress.Status>
//                 </div>
//                 <div>
//                     <div className="text-muted-foreground">Fulfillment</div>
//                     <Progress.Status>
//                         {item?.deliveryStatus || "-"}
//                     </Progress.Status>
//                 </div>
//             </div>
//         </div>
//     );
// }

