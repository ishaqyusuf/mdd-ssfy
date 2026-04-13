"use client";

import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import { columns, mobileColumn } from "./columns";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";

export function DataTable({
    defaultProductKind = "inventory",
}: {
    defaultProductKind?: "inventory" | "component";
}) {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters, hasFilters, setFilters } = useInventoryFilterParams();
    const { setParams } = useInventoryParams();
    const effectiveFilters = {
        ...filters,
        productKind: filters.productKind ?? defaultProductKind,
        showCustom: filters.showCustom ?? false,
    };
    const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
        filter: effectiveFilters,
        route: trpc.inventories.inventoryProducts,
    });

    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });

    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        const isComponent = defaultProductKind === "component";
        return (
            <EmptyState
                label={isComponent ? "components" : "inventory items"}
                CreateButton={
                    <Button
                        size="sm"
                        onClick={() =>
                            setParams({
                                productId: -1,
                                defaultValues: {
                                    product: {
                                        productKind: defaultProductKind,
                                    },
                                } as any,
                            })
                        }
                    >
                        <Icons.Add className="mr-2 size-4" />
                        <span>
                            {isComponent
                                ? "Create Component"
                                : "Create Inventory"}
                        </span>
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
