"use client";

import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import { columns, mobileColumn } from "./columns";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";

export function DataTable() {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters, hasFilters, setFilters } = useInventoryFilterParams();
    const { setParams } = useInventoryCategoryParams();
    const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
        filter: filters,
        route: trpc.inventories.inventoryCategories,
    });
    const inventory = useInventoryTrpc();
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });

    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                label="categories"
                CreateButton={
                    <Button
                        size="sm"
                        onClick={() => setParams({ editCategoryId: -1 })}
                    >
                        <Icons.Add className="mr-2 size-4" />
                        <span>Create Category</span>
                    </Button>
                }
            />
        );
    }

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
