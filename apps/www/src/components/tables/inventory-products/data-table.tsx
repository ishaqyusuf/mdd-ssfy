"use client";

import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { columns, mobileColumn } from "./columns";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";

export function DataTable({
    defaultProductKind = "inventory",
}: {
    defaultProductKind?: "inventory" | "component";
}) {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useInventoryFilterParams();
    const effectiveFilters = {
        ...filters,
        productKind: filters.productKind ?? defaultProductKind,
    };
    const { data, ref: loadMoreRef, hasNextPage } = useTableData({
        filter: effectiveFilters,
        route: trpc.inventories.inventoryProducts,
    });

    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });

    return (
        <Table.Provider
            args={[
                {
                    columns,
                    mobileColumn,
                    data,
                    checkbox: true,
                    tableScroll,
                    props: { loadMoreRef, hasNextPage },
                    // rowSelection,
                    // setRowSelection,
                    tableMeta: {
                        rowClick(id, rowData) {},
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                <Table>
                    <Table.TableHeader />
                    <Table.Body>
                        <Table.TableRow />
                    </Table.Body>
                </Table>
                <Table.LoadMore />
            </div>
        </Table.Provider>
    );
}
