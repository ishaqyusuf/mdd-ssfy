"use client";

import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { columns, mobileColumn } from "./columns";
import { useInventoryImportFilterParams } from "@/hooks/use-inventory-import-filter-params";

export function DataTable() {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useInventoryImportFilterParams();
    const { data, ref: loadMoreRef, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.inventories.inventoryImports,
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
                    tableScroll,
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

