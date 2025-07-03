"use client";

import { TableShellProps } from "@/types/data-table";
// import { ISalesOrder } from "@/types/ISales";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState, useTransition } from "react";
import {
    Cell,
    CheckColumn,
    ColumnHeader,
    PrimaryCellContent,
    _FilterColumn,
} from "../../../../../components/_v1/columns/base-columns";
import {
    OrderCustomerCell,
    OrderIdCell,
    OrderInvoiceCell,
    OrderMemoCell,
    OrderPriorityFlagCell,
    OrderProductionStatusCell,
} from "../orders/components/cells/sales-columns";
import { ISalesOrder } from "@/types/sales";
import { DataTable2 } from "../../../../../components/_v1/data-table/data-table-2";

import { SalesCustomerFilter } from "../orders/components/sales-customer-filter";
import { labelValue, truthy } from "@/lib/utils";
import { DeliveryStatusCell } from "../../../../../components/_v1/sales/delivery-status-cell";
import { DeliveryBatchAction } from "../../../../../components/_v1/list-selection-action/delivery-selection-action";
import {
    RowActionCell,
    RowActionMenuItem,
    RowActionMoreMenu,
} from "../../../../../components/_v1/data-table/data-table-row-actions";
import { TableCol } from "@/components/common/data-table/table-cells";
import { parseAsStringEnum, useQueryStates } from "nuqs";

export default function DeliveryTableShell({
    data,
    pageInfo,
    searchParams,
}: TableShellProps) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const [queryParams, setQueryParams] = useQueryStates({
        _deliveryStatus: parseAsStringEnum(["queued", "ready"] as const),
    });
    const columns = useMemo<ColumnDef<ISalesOrder, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            {
                maxSize: 10,
                id: "flags",
                cell: ({ row }) => OrderPriorityFlagCell(row.original, true),
            },
            {
                accessorKey: "orderId",
                cell: ({ row }) =>
                    OrderIdCell(row.original, "/sales/production/slug"),
                header: ColumnHeader("Order"),
            },
            {
                accessorKey: "customer",
                header: ColumnHeader("Customer"),
                cell: ({ row }) => OrderCustomerCell(row.original.customer),
            },
            {
                accessorKey: "salesRep",
                header: ColumnHeader("Sales Rep"),
                cell: ({ row }) => (
                    <>
                        <TableCol.Primary>
                            {row.original.salesRep?.name}
                        </TableCol.Primary>
                    </>
                ),
            },
            {
                accessorKey: "memo",
                header: ColumnHeader("Memo"),
                cell: ({ row }) => OrderMemoCell(row.original.shippingAddress),
            },
            ...truthy<any>(
                queryParams._deliveryStatus == "ready",
                [
                    {
                        accessorKey: "details",
                        header: ColumnHeader("Truck Details"),
                        cell: ({ row }) => (
                            <Cell>
                                <PrimaryCellContent>
                                    {row?.original?.meta?.truck}
                                </PrimaryCellContent>
                            </Cell>
                        ),
                    },
                ],
                [
                    {
                        accessorKey: "production",
                        header: ColumnHeader("Production"),
                        cell: ({ row }) =>
                            OrderProductionStatusCell(row.original),
                    },
                ],
            ),

            {
                accessorKey: "status",
                header: ColumnHeader("Delivery"),
                cell: ({ row }) => <DeliveryStatusCell order={row.original} />,
            },
            ..._FilterColumn("_status", "_customerId", "_deliveryStatus"),
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <>
                        <RowActionCell>
                            <RowActionMoreMenu>
                                <RowActionMenuItem>
                                    Ready For Delivery
                                </RowActionMenuItem>
                            </RowActionMoreMenu>
                        </RowActionCell>
                    </>
                ),
            },
        ],
        [data, isPending],
    );
    return (
        <DataTable2
            searchParams={searchParams}
            columns={columns}
            pageInfo={pageInfo}
            data={data}
            BatchAction={DeliveryBatchAction}
            filterableColumns={[
                {
                    id: "_deliveryStatus",
                    title: "Status",
                    single: true,
                    options: [
                        labelValue("Pending Production", "pending production"),
                        labelValue("Queued for Delivery", "queued"),
                        labelValue("Ready For Delivery", "ready"),
                        labelValue("In Transit", "transit"),
                        labelValue("Delivered", "delivered"),
                    ],
                },
                {
                    id: "_payment" as any,
                    title: "Invoice",
                    single: true,
                    options: [
                        { label: "Paid", value: "Paid" },
                        // { label: "Part Paid", value: "Part" },
                        { label: "Pending", value: "Pending" },
                    ],
                },
                SalesCustomerFilter,
            ]}
            searchableColumns={[
                {
                    id: "_q" as any,
                    title: "orderId, customer",
                },
            ]}
            dateFilterColumns={[
                {
                    id: "_date" as any,
                    title: "Date",
                },
            ]}
        />
    );
}
