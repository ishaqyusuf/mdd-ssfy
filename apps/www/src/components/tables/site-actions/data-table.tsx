"use client";

import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@gnd/ui/tanstack";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { TableProvider } from "..";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMore } from "../load-more";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter } = useInboundFilterParams();
    const { ref, inView } = useInView();

    const infiniteQueryOptions = trpc.siteActions.index.infiniteQueryOptions(
        {
            ...filter,
        },
        {
            getNextPageParam: ({ meta }) => {
                return (meta as any)?.cusor?.toString();
            },
        },
    );
    const { data, fetchNextPage, hasNextPage, isFetching } =
        useSuspenseInfiniteQuery(infiniteQueryOptions);
    const tableData = useMemo(() => {
        return data?.pages.flatMap((page) => (page as any)?.data ?? []) ?? [];
    }, [data]);
    useEffect(() => {
        if (inView) {
            fetchNextPage();
        }
    }, [inView]);
    return (
        <TableProvider
            args={[
                {
                    columns: columns,
                    data: tableData,
                    // hasNextPage,
                    // loadMore,
                    // pageSize,
                    // setParams,
                    // params,
                    tableMeta: {
                        deleteAction(id) {
                            // deleteStudent.execute({
                            //   studentId: id,
                            // });
                        },
                        rowClick(id, rowData) {
                            // setParams({
                            //     studentViewId: id,
                            // });
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
                <LoadMore ref={ref} hasNextPage={hasNextPage} />
            </div>
        </TableProvider>
    );
}
