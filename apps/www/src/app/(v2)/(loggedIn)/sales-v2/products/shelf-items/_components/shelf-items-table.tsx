"use client";
import { PromiseDataTable } from "@/types";
import { getShelfItems } from "../../_actions/get-shelf-items";
import React from "react";
import useDataTableColumn from "@/components/common/data-table/columns/use-data-table-columns";
import { TableCol } from "@/components/common/data-table/table-cells";
import { deleteDykeShelfItem } from "../../_actions/delete-shelf-item-action";

import { DynamicFilter } from "@/components/_v1/data-table/data-table-dynamic-filter";
import { getShelfCategories } from "../../_actions/get-shelf-categories";
import { DataTable2 } from "@/components/_v1/data-table/data-table-2";
import { useModal } from "@/components/common/modal/provider";
import ShelfItemFormModal from "../_shelf-item-form-modal";

type Promise = PromiseDataTable<typeof getShelfItems>;
export type ShelfItem = Awaited<Promise>["data"][0];
// export type ShelfItem = Awaited<ReturnType<typeof getShelfItems>>["data"][0];
interface Props<T> {
    promise: Promise;
}

export default function ShelfItemsTable<T>({ promise }: Props<T>) {
    const { data, pageCount } = React.use(promise);
    // console.log(data.length);

    const table = useDataTableColumn(
        data,
        (ctx) => [
            ctx.Column("Product", ({ item }) => (
                <TableCol>
                    <TableCol.Primary>{item.title}</TableCol.Primary>
                    <TableCol.Secondary>
                        {item.category?.name}
                    </TableCol.Secondary>
                </TableCol>
            )),
            ctx.Column("Price", ({ item }) => (
                <TableCol>
                    <TableCol.Primary>
                        <TableCol.Money value={item.unitPrice} />
                    </TableCol.Primary>
                </TableCol>
            )),
            ctx.ActionColumn(({ item }) => (
                <>
                    <TableCol.Btn
                        icon="edit"
                        onClick={(e) => {
                            modal?.openModal(
                                <ShelfItemFormModal data={item as any} />
                            );
                        }}
                    />
                    <TableCol.DeleteRow
                        action={deleteDykeShelfItem}
                        data={item}
                    />
                </>
            )),
            // ...ctx.queryFields("_q", "_categoryId"),
        ],
        true,
        {
            sn: true,
            filterCells: ["_q"],
        }
    );
    const modal = useModal();
    return (
        <DataTable2
            columns={table.columns}
            data={data}
            pageCount={pageCount}
            searchableColumns={[
                {
                    id: "_q" as any,
                    title: "products",
                },
            ]}
            filterableColumns={[
                ({ table }) => (
                    <DynamicFilter
                        table={table}
                        single
                        title="Category"
                        columnId="_categoryId"
                        listKey={"shelfCats" as any}
                        loader={getShelfCategories}
                    />
                ),
            ]}
            BatchAction={({ table: _table }) => (
                <>
                    <TableCol.BatchDelete
                        table={_table}
                        action={deleteDykeShelfItem}
                        selectedIds={table.selectedRowIds}
                    />
                </>
            )}
            Toolbar={({ table }) => (
                <>
                    <TableCol.NewBtn
                        onClick={() => {
                            modal?.openModal(<ShelfItemFormModal />);
                        }}
                    />
                </>
            )}
        />
    );
}
