"use client";

import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";
import { useCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import { useRouter } from "next/navigation";
import { BatchActions } from "./batch-actions";
export function DataTable() {
    const trpc = useTRPC();
    const router = useRouter();
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
    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                CreateButton={
                    <Button size="sm" onClick={() => router.push("/community/projects")}>
                        <span>Projects</span>
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
                    props: {
                        loadMoreRef: ref,
                        hasNextPage,
                    },
                    tableScroll,
                    checkbox: true,
                    tableMeta: {
                        hidePagination: true,
                        rowClick(id, rowData) {
                            router.push(`/community/projects/${rowData?.slug}`);
                        },
                    },
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
                <Table.LoadMore />
                <BatchActions />
            </div>
        </Table.Provider>
    );
}
