"use client";

import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { columns } from "./columns";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";

export function DataTable() {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useInventoryFilterParams();
    const { data, ref: loadMoreRef, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.inventories.inventoryCategories,
    });
    const inventory = useInventoryTrpc();
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    return (
        <Table.Provider
            args={[
                {
                    columns,
                    data,
                    checkbox: true,
                    tableScroll,
                    props: { loadMoreRef, hasNextPage },
                    // rowSelection,
                    // setRowSelection,
                    tableMeta: {
                        rowClick(id, rowData) {},
                        deleteAction(id) {
                            inventory.deleteCategory(id);
                        },
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

