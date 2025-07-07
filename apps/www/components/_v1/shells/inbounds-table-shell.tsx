"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEmployeeProfile } from "@/app/(v1)/_actions/hrm/employee-profiles";
import { updateInboundStatusAction } from "@/app/(v1)/_actions/sales-inbound/update-inbound-status";
import { EmployeeProfile } from "@/db";
import { InboundStatus } from "@/lib/status";
import { TableShellProps } from "@/types/data-table";
import { IInboundOrder } from "@/types/sales-inbound";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import {
    Cell,
    ColumnHeader,
    DateCellContent,
    PrimaryCellContent,
} from "../columns/base-columns";
import { DataTable2 } from "../data-table/data-table-2";
import {
    DeleteRowAction,
    RowActionCell,
    RowActionMenuItem,
    RowActionMoreMenu,
} from "../data-table/data-table-row-actions";
import { SmartTable } from "../data-table/smart-table";
import { BuilderFilter } from "../filters/builder-filter";
import StatusBadge from "../status-badge";

export default function InboundsTableShell<T>({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<IInboundOrder>) {
    const [isPending, startTransition] = useTransition();
    // console.log(data);
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const route = useRouter();
    async function updateStatus(slug, status) {
        await updateInboundStatusAction(slug, status);
        toast.success("Updated");
        route.refresh();
    }
    const table = SmartTable<IInboundOrder>(data);

    const columns = useMemo<ColumnDef<IInboundOrder, unknown>[]>(
        () => [
            table.simpleColumn(
                "#/Date",
                (data) => ({
                    link: `/sales/inbounds/putaway?_q=${data.slug}`,
                    story: [
                        table.primaryText(data.orderId),
                        table.secondary(data.createdAt),
                    ],
                }),
                { id: "id" },
            ),

            table.simpleColumn("Putaway", (data) => {
                const putAway = data.inboundItems.filter(
                    (ii) => ii.putawayAt,
                ).length;
                const total = data.inboundItems.length;
                return {
                    story: [table.status(`${putAway}/${total}`)],
                };
            }),
            table.simpleStatus("status"),
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        <DeleteRowAction
                            row={row.original}
                            action={deleteEmployeeProfile}
                        />
                        <RowActionMoreMenu>
                            <RowActionMenuItem
                                SubMenu={
                                    <>
                                        {InboundStatus.map((status) => (
                                            <RowActionMenuItem
                                                onClick={() =>
                                                    updateStatus(
                                                        row.original.slug,
                                                        status,
                                                    )
                                                }
                                                key={status}
                                            >
                                                {status}
                                            </RowActionMenuItem>
                                        ))}
                                    </>
                                }
                            >
                                Status
                            </RowActionMenuItem>
                        </RowActionMoreMenu>
                    </RowActionCell>
                ),
            },
        ], //.filter(Boolean) as any,
        [data, isPending],
    );
    return (
        <DataTable2
            searchParams={searchParams}
            columns={columns}
            pageInfo={pageInfo}
            data={data}
            filterableColumns={[BuilderFilter]}
            searchableColumns={[
                {
                    id: "_q" as any,
                    title: "",
                },
            ]}

            //  deleteRowsAction={() => void deleteSelectedRows()}
        />
    );
}
