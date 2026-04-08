"use client";

import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { columns, mobileColumn, type Item } from "./columns";
import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { GetProjectUnitsSchema } from "@api/db/queries/project-units";
import { BatchActions } from "./batch-actions";
import { useSortParams } from "@/hooks/use-sort-params";
import { useRouter } from "next/navigation";
interface Props {
    defaultFilters?: GetProjectUnitsSchema;
    embedded?: boolean;
    columns?: ColumnDef<Item>[];
}
export function DataTable(props: Props) {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useProjectUnitStore();
    const { filters, hasFilters, setFilters } = useProjectUnitFilterParams();
    const { params, setParams } = useSortParams();
    const router = useRouter();
    const {
        data,
        ref: loadMoreRef,
        hasNextPage,
        isFetching,
    } = useTableData({
        filter: {
            ...filters,
            ...(props.defaultFilters || {}),
            sort: params.sort,
        },
        route: trpc.community.getProjectUnits,
    });
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        if (props.embedded) {
            return <EmptyState label="Units" />;
        }
        return (
            <EmptyState
                CreateButton={
                    <Button asChild size="sm">
                        <Link href="/">
                            <Icons.Add className="mr-2 size-4" />
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
                    columns: props.columns || columns,
                    mobileColumn,
                    data,
                    params,
                    setParams,
                    props: {
                        loadMoreRef,
                        hasNextPage,
                    },
                    tableScroll,
                    checkbox: true,
                    tableMeta: {
                        rowClick(id, rowData) {
                            router.push(`/community/project-units/${rowData.slug}`);
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
                {!props.embedded ? <BatchActions /> : null}
            </div>
        </Table.Provider>
    );
}
