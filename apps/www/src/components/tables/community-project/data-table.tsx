"use client";

import { useTRPC } from "@/trpc/client";
import { createTableContext, Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";
import { TableHeader } from "@gnd/ui/data-table/table-header";
import { useCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
export function DataTable() {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useCommunityProjectStore();
    const { filters, hasFilters, setFilters } =
        useCommunityProjectFilterParams();
    const { data, ref, isFetching, hasNextPage } = useTableData({
        filter: {
            ...filters,
        },
        route: trpc.community.getCommunityProjects,
    });
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const { setParams } = useCommunityProjectParams();
    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                CreateButton={
                    <Button asChild size="sm">
                        <Link href="/sales-book/create-order">
                            <Icons.add className="mr-2 size-4" />
                            <span>New</span>
                        </Link>
                    </Button>
                }
            />
        );
    }
    return (
        <Table.Provider
            value={createTableContext({
                columns,
                mobileColumn,
                data,
                props: {
                    loadMoreRef: ref,
                    hasNextPage,
                },
                tableScroll,
                // rowSelection,
                // setRowSelection,
                tableMeta: {
                    rowClick(id, rowData) {
                        setParams({
                            openCommunityProjectId: rowData.id,
                        });
                    },
                },
            })}
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
                <Table.LoadMore />
                {/* <BatchActions /> */}
            </div>
        </Table.Provider>
    );
}

