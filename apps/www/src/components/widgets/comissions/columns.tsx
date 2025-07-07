import { getCommissionPayments } from "@/actions/get-comission-payments";
import { getCommissionsList } from "@/actions/get-commissions-list";
import ProgressStatus from "@/components/_v1/progress-status";
import { AnimatedNumber } from "@/components/animated-number";
import { ActionCell } from "@/components/tables/action-cell";
import { PageItemData } from "@/types/type";
import { ColumnDef } from "@tanstack/react-table";

export type Item = PageItemData<typeof getCommissionsList>;

export const columns: ColumnDef<Item>[] = [
    {
        header: "commission #",
        accessorKey: "commissionId",
        cell: ({ row: { original: item } }) => <div>{item?.paymentId}</div>,
    },
    {
        header: "order #",
        accessorKey: "orderNo",
        cell: ({ row: { original: item } }) => <div>{item?.orderNo}</div>,
    },
    {
        header: "amount",
        accessorKey: "amount",
        cell: ({ row: { original: item } }) => (
            <div className="text-end">
                <AnimatedNumber value={item?.amount} />
            </div>
        ),
    },
    {
        header: "status",
        accessorKey: "status",
        cell: ({ row: { original: item } }) => (
            <div className="text-end">
                <ProgressStatus status={item.status} />
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
            return <ActionCell trash itemId={item.id}></ActionCell>;
        },
    },
];
