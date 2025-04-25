"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
    getStaticCategories,
    getStaticProducts,
} from "@/app/(v1)/_actions/sales-products/statics";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { TableShellProps } from "@/types/data-table";
import { IProductVariant } from "@/types/product";
import { ColumnDef } from "@tanstack/react-table";

import { SalesCustomerFilter } from "../../../app/(v1)/(loggedIn)/sales/orders/components/sales-customer-filter";
import {
    _FilterColumn,
    Cell,
    CheckColumn,
    ColumnHeader,
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import { DataTable2 } from "../data-table/data-table-2";
import { DynamicFilter } from "../data-table/data-table-dynamic-filter";
import {
    DeleteRowAction,
    EditRowAction,
    RowActionCell,
} from "../data-table/data-table-row-actions";
import { SalesBatchAction } from "../list-selection-action/sales-selection-action";
import Money from "../money";

export default function ProductsTableShell({
    data,
    pageInfo,
    searchParams,
}: TableShellProps<IProductVariant>) {
    const [isPending, startTransition] = useTransition();

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const columns = useMemo<ColumnDef<IProductVariant, unknown>[]>(
        () => [
            CheckColumn({ selectedRowIds, setSelectedRowIds, data }),
            {
                accessorKey: "id",
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
                header: ColumnHeader("#"),
            },
            {
                accessorKey: "product",
                header: ColumnHeader("Product"),
                cell: ({ row }) => (
                    <Cell>
                        {row.original.variantTitle != row.original.title && (
                            <PrimaryCellContent>
                                {row.original.variantTitle}
                            </PrimaryCellContent>
                        )}
                        <SecondaryCellContent>
                            {row.original.title}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                accessorKey: "category",
                header: ColumnHeader("Category"),
                cell: ({ row }) => (
                    <Cell>
                        <SecondaryCellContent className="uppercase">
                            {row.original.product?.category}
                        </SecondaryCellContent>
                    </Cell>
                ),
            },
            {
                accessorKey: "price",
                header: ColumnHeader("Price"),
                cell: ({ row }) => (
                    <Cell>
                        <PrimaryCellContent>
                            <Money value={row.original.price} />
                        </PrimaryCellContent>
                    </Cell>
                ),
            },

            ..._FilterColumn("_q", "_category"),
            {
                accessorKey: "actions",
                header: ColumnHeader(""),
                size: 15,
                maxSize: 15,
                enableSorting: false,
                cell: ({ row }) => (
                    <RowActionCell>
                        {/* <EditRowAction /> */}
                        {/* <DeleteRowAction
                            row={row.original}
                            action={deleteLegacyProductAction}
                        /> */}
                    </RowActionCell>
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
            filterableColumns={[
                ({ table }) => (
                    <DynamicFilter
                        table={table}
                        single
                        listKey="staticProductCategories"
                        labelKey="category"
                        title="category"
                        columnId="_category"
                        loader={getStaticCategories}
                    />
                ),
            ]}
            searchableColumns={[
                {
                    id: "_q" as any,
                    title: "",
                },
            ]}
        />
    );
}
