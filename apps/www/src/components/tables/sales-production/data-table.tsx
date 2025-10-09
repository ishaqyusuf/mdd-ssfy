"use client";

import { useTRPC } from "@/trpc/client";
import { columns, workerColumns } from "./columns";
import { Table, useTableData } from "@gnd/ui/data-table";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";

interface Props {
    workerMode?: boolean;
}
export function DataTable(props: Props) {
    const { workerMode } = props;
    const trpc = useTRPC();
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useSalesProductionFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: {
            ...filters,
        },
        route: workerMode ? trpc.sales.productionTasks : trpc.sales.productions,
    });
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const overviewQuery = useSalesOverviewQuery();
    //  if (hasFilters && !data?.length) {
    //         return <NoResults setFilter={setFilters} />;
    //     }

    //     if (!data?.length && !isFetching) {
    //         return (
    //             <EmptyState
    //                 CreateButton={
    //                     <Button asChild size="sm">
    //                         <Link href="/sales-book/create-order">
    //                             <Icons.add className="mr-2 size-4" />
    //                             <span>New</span>
    //                         </Link>
    //                     </Button>
    //                 }
    //             />
    //         );
    //     }
    return (
        <Table.Provider
            // value={createTableContext({
            args={[
                {
                    columns: workerMode ? workerColumns : columns,
                    data,
                    tableScroll,
                    rowSelection,
                    setRowSelection,
                    props: {
                        loadMoreRef: ref,
                        hasNextPage,
                    },
                    tableMeta: {
                        rowClick(id, rowData) {
                            overviewQuery.open2(
                                rowData.uuid,
                                "production-tasks",
                            );
                        },
                    },
                    // })}
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                <div
                    ref={tableScroll.containerRef}
                    className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                >
                    <Table>
                        <Table.TableHeader />
                        <Table.Body>
                            <Table.TableRow />
                        </Table.Body>
                    </Table>
                </div>
                {hasNextPage && <Table.LoadMore />}
                <BatchActions />
            </div>
        </Table.Provider>
    );
}

