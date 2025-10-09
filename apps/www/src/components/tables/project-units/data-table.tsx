"use client";

import { useTRPC } from "@/trpc/client";
import { createTableContext, Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";
import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useProjectUnitParams } from "@/hooks/use-project-units-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
import { GetProjectUnitsSchema } from "@api/db/queries/project-units";
import { BatchActions } from "./batch-actions";
interface Props {
    defaultFilters?: GetProjectUnitsSchema;
}
export function DataTable(props: Props) {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useProjectUnitStore();
    const { filters, hasFilters, setFilters } = useProjectUnitFilterParams();
    const {
        data,
        ref: loadMoreRef,
        hasNextPage,
        isFetching,
    } = useTableData({
        filter: {
            ...filters,
            ...(props.defaultFilters || {}),
        },
        route: trpc.community.getProjectUnits,
    });
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const { setParams } = useProjectUnitParams();
    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                CreateButton={
                    <Button asChild size="sm">
                        <Link href="/">
                            <Icons.add className="mr-2 size-4" />
                            <span>New</span>
                        </Link>
                    </Button>
                }
                onCreate={(e) => {}}
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
                    props: {
                        loadMoreRef,
                        hasNextPage,
                    },
                    tableScroll,
                    // rowSelection,
                    // setRowSelection,
                    tableMeta: {
                        rowClick(id, rowData) {
                            setParams({
                                openProjectUnitId: rowData.id,
                            });
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                <div
                    // ref={tableScroll.containerRef}
                    className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                >
                    <Table>
                        <Table.TableHeader />
                        <Table.Body>
                            <Table.TableRow />
                        </Table.Body>
                    </Table>
                </div>
                <Table.LoadMore />
                <BatchActions />
            </div>
        </Table.Provider>
    );
}

