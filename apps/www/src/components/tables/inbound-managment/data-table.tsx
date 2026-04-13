"use client";

import {
    useInboundFilterParams,
    useInboundView,
} from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter, hasFilters } = useInboundFilterParams();
    const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
        filter,
        route: trpc.sales.inboundIndex,
    });
    // const { ref, inView } = useInView();
    const { setParams: setInboundViewParams } = useInboundView();
    // const infiniteQueryOptions = (
    //     trpc.sales.inboundIndex as any
    // ).infiniteQueryOptions(
    //     {
    //         ...filter,
    //     },
    //     {
    //         getNextPageParam: ({ meta }) => {
    //             return meta?.cursor;
    //         },
    //     },
    // );
    // const { data, fetchNextPage, hasNextPage, isFetching } =
    //     useSuspenseInfiniteQuery(infiniteQueryOptions);
    // const tableData = useMemo(() => {
    //     return data?.pages.flatMap((page) => (page as any)?.data ?? []) ?? [];
    // }, [data]);
    // useEffect(() => {
    //     if (inView) {
    //         fetchNextPage();
    //     }
    // }, [inView]);
    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilter} />;
    }

    if (!data?.length && !isFetching) {
        return <EmptyState label="inbounds" />;
    }

    return (
        <Table.Provider
            args={[
                {
                    columns,
                    mobileColumn,
                    data,
                    props: { loadMoreRef, hasNextPage },
                    tableMeta: {
                        deleteAction(id) {
                            // deleteStudent.execute({
                            //   studentId: id,
                            // });
                        },
                        rowClick(id, rowData) {
                            setInboundViewParams({
                                payload: rowData,
                                viewInboundId: Number(id),
                            });
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4">
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
