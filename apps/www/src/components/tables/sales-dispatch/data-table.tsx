"use client";

import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { TableProvider } from "..";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";
import { useSalesPreview } from "@/hooks/use-sales-preview";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter } = useInboundFilterParams();
    const { ref, inView } = useInView();

    const infiniteQueryOptions = (
        trpc.dispatch.index as any
    ).infiniteQueryOptions(
        {
            ...filter,
        },
        {
            getNextPageParam: ({ meta }) => {
                return meta?.cursor;
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

    const { setParams: setSalesPreviewParams } = useSalesPreview();
    return (
        <TableProvider
            args={[
                {
                    columns: columns,
                    data: tableData,
                    tableMeta: {
                        deleteAction(id) {
                            // deleteStudent.execute({
                            //   studentId: id,
                            // });
                        },
                        rowClick(id, rowData) {
                            setSalesPreviewParams({
                                previewMode: "packing list",
                                salesPreviewSlug: rowData?.order?.orderId,
                                salesPreviewType: "order",
                                dispatchId: id,
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

                {!hasNextPage || (
                    <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
                )}
            </div>
        </TableProvider>
    );
}
