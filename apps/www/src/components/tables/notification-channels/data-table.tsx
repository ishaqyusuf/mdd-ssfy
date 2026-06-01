"use client";

import { createTableContext, Table, useTableData } from "@gnd/ui/data-table";
import { columns, ListItem, mobileColumn, type Item } from "./columns";

import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";

import { useNotificationChannelFilterParams } from "@/hooks/use-notification-channel-filter-params";
import { useNotificationChannelParams } from "@/hooks/use-notification-channel-params";
import { useTRPC } from "@/trpc/client";
import { GetNotificationChannelsSchema } from "@notifications/schemas";
interface Props {
    defaultFilters?: GetNotificationChannelsSchema;
}
export function DataTable(props: Props) {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useNotificationChannelStore();
    const { filters, hasFilters, setFilters } =
        useNotificationChannelFilterParams();
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
        route: trpc.notes.getNotificationChannels,
    });
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const { setParams } = useNotificationChannelParams();
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
                                openNotificationChannelId: rowData.id,
                            });
                        },
                    },
                },
            ]}
        >
            <div className="flex">
                <div className="flex flex-col gap-4 w-full">
                    <div
                        // ref={tableScroll.containerRef}
                        className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                    >
                        {/* <Table>
                            <Table.TableHeader />
                            <Table.Body>
                                <Table.TableRow />
                            </Table.Body>
                        </Table> */}
                        {(data as Item[] | undefined)?.map((row) => (
                            <ListItem key={row.id} item={row} />
                        ))}
                    </div>
                    <Table.LoadMore />
                    {/* <BatchActions /> */}
                </div>
            </div>
        </Table.Provider>
    );
}
