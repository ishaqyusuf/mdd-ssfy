"use client";

import {
    useInboundFilterParams,
    useInboundView,
} from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { TableProvider, useTableData } from "..";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter } = useInboundFilterParams();
    const { data, ref, hasNextPage } = useTableData({
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
    return (
        <TableProvider
            args={[
                {
                    columns: columns,
                    data,
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
                    <TableHeaderComponent />
                    <TableBody>
                        <TableRow />
                    </TableBody>
                </Table>
                {/* {JSON.stringify(data?.pages?.[0]?.meta)} */}
                {hasNextPage ? "Load More" : "No more data"}
                {!hasNextPage || (
                    <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
                )}
            </div>
        </TableProvider>
    );
}
