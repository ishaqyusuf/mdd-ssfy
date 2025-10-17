import { getCommissionPayments } from "@/actions/get-comission-payments";
import { ActionCell } from "@/components/tables/action-cell";
import { PageItemData } from "@/types/type";
import { ColumnDef } from "@tanstack/react-table";

export type Item = PageItemData<typeof getCommissionPayments>;

export const columns: ColumnDef<Item>[] = [
    {
        header: "commissionId",
        accessorKey: "commissionId",
        cell: ({ row: { original: item } }) => <div>{item?.paymentId}</div>,
    },
    {
        header: "action",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return <ActionCell trash itemId={item.id}></ActionCell>;
        },
    },
];
