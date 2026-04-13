"use client";

import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { columns, mobileColumn } from "./columns";
import { useInventoryImportFilterParams } from "@/hooks/use-inventory-import-filter-params";

export function DataTable({
    scope,
}: {
    scope?: "active" | "all";
}) {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters, hasFilters, setFilters } = useInventoryImportFilterParams();
    const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
        filter: {
            ...filters,
            scope: scope ?? filters.scope ?? "active",
        },
        route: trpc.inventories.inventoryImports,
    });

    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });

    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        return <EmptyState label="import steps" />;
    }
    return (
        <Table.Provider
            args={[
                {
                    columns,
                    mobileColumn,
                    data,
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
