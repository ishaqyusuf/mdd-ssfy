"use client";

import { TableShellProps } from "@/types/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState, useTransition } from "react";
import {
    CheckColumn,
    ColumnHeader,
    Cell,
    PrimaryCellContent,
    DateCellContent,
    SecondaryCellContent,
} from "../../../../../../components/_v1/columns/base-columns";

import { DataTable2 } from "../../../../../../components/_v1/data-table/data-table-2";

import { BuilderFilter } from "../../../../../../components/_v1/filters/builder-filter";
import { openModal } from "@/lib/modal";
import { IJobPayment, IUser } from "@/types/hrm";
import Money from "../../../../../../components/_v1/money";
import {
    DeleteRowAction,
    RowActionCell,
} from "../../../../../../components/_v1/data-table/data-table-row-actions";
import { _deleteJobPayment } from "@/app/(v1)/_actions/hrm-jobs/payment.crud";

export default function JobPaymentTableShell({
    data,
    pageInfo,
    searchParams,
    admin,
}: TableShellProps<IJobPayment> & {
    admin?: boolean;
}) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const columns = useMemo<ColumnDef<IJobPayment, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            {
                maxSize: 10,
                id: "id",
                header: ColumnHeader("#/Date"),
                cell: ({ row }) => (
                    <Cell>
                        <PrimaryCellContent>
                            {row.original.id}
                        </PrimaryCellContent>
                        <DateCellContent>
                            {row.original.createdAt}
                        </DateCellContent>
                    </Cell>
                ),
            },
            {
                id: "job",
                header: ColumnHeader("Paid To"),
                cell: ({ row }) => (
                    <Cell
                        className="cursor-pointer"
                        onClick={() =>
                            openModal("paymentOverview", row.original)
                        }
                    >
                        <PrimaryCellContent>
                            {row.original.user?.name}
                        </PrimaryCellContent>
                        <SecondaryCellContent>
                            {row.original.user?.username}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "user",
                header: ColumnHeader("Paid For"),
                cell: ({ row }) => (
                    <Cell>
                        <SecondaryCellContent>
                            {row.original._count.jobs} Job(s)
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "charges",
                header: ColumnHeader("Discount"),
                cell: ({ row }) => (
                    <Cell>
                        <SecondaryCellContent>
                            <Money value={row.original.charges} />
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "total",
                header: ColumnHeader("Amount Paid"),
                cell: ({ row }) => (
                    <Cell>
                        <SecondaryCellContent>
                            <Money value={row.original?.amount} />
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                id: "payer",
                header: ColumnHeader("Paid By"),
                cell: ({ row }) => {
                    return (
                        <Cell>
                            <SecondaryCellContent>
                                {row.original.payer?.name}
                            </SecondaryCellContent>
                            {row?.original?.payer?.roles?.[0]?.name}
                        </Cell>
                    );
                },
            },
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        {admin && (
                            <DeleteRowAction
                                row={row.original}
                                action={_deleteJobPayment}
                            />
                        )}
                    </RowActionCell>
                ),
            },
            {
                accessorKey: "_q",
                enableHiding: false,
            },
        ], //.filter(Boolean) as any,
        [data, isPending]
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
                    title: "filter",
                },
            ]}

            //  deleteRowsAction={() => void deleteSelectedRows()}
        />
    );
}
