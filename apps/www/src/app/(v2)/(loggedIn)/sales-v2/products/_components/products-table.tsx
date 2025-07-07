"use client";

import { SmartTable } from "@/components/_v1/data-table/smart-table";
import { TableShellProps } from "@/types/data-table";
import { getDykeProducts } from "../_actions/get-dyke-products";
import { useMemo } from "react";
import { DataTable2 } from "@/components/_v1/data-table/data-table-2";
import { ColumnDef } from "@tanstack/react-table";
import { _FilterColumn } from "@/components/_v1/columns/base-columns";
import { ProductCategoryFilter } from "../../_components/filters/product-category-filter";
import {
    DeleteRowAction,
    EditRowAction,
    RowActionCell,
} from "@/components/_v1/data-table/data-table-row-actions";
import { deleteDykeProductAtion } from "../_actions/delete-product-action";
import EditProductModal from "../_modals/edit-product-modal";
import Money from "@/components/_v1/money";
import { ServerPromiseType } from "@/types";
import { useModal } from "@/components/common/modal/provider";

export type IDykeProduct = ServerPromiseType<typeof getDykeProducts>["Item"];

export default function ProductsTable({
    data,
    pageInfo,
    searchParams,
}: TableShellProps) {
    const table = SmartTable<IDykeProduct>(data);

    const modal = useModal();
    const columns = useMemo<ColumnDef<IDykeProduct, unknown>[]>(
        () => [
            table.checkColumn(),
            table.simpleColumn("Product", (data) => ({
                story: [
                    table.primaryText(data.title),
                    table.secondary(data.description),
                ],
            })),
            table.simpleColumn("Category", (data) => ({
                story: [table.primaryText(data.category?.title)],
            })),
            table.simpleColumn("Qty", (data) => ({
                story: [table.primaryText(data.qty)],
            })),
            table.simpleColumn("Price", (data) => ({
                story: [table.primaryText(<Money value={data.price} />)],
            })),
            ..._FilterColumn("_q", "_categoryId"),
            {
                id: "actions",
                cell: ({ row }) => (
                    <RowActionCell>
                        <EditRowAction
                            onClick={(e) => {
                                modal?.openModal(
                                    <EditProductModal data={row.original} />
                                );
                            }}
                        />
                        <DeleteRowAction
                            row={row.original}
                            action={deleteDykeProductAtion}
                        />
                    </RowActionCell>
                ),
            },
        ],
        [data]
    ); //table.Columns([table.checkColumn()]);

    return (
        <DataTable2
            data={data}
            columns={columns}
            searchParams={searchParams}
            pageInfo={pageInfo}
            filterableColumns={[ProductCategoryFilter]}
            searchableColumns={[
                {
                    id: "_q" as any,
                    title: "title",
                },
            ]}
        />
    );
}
