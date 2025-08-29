"use client";

import {
    useInboundFilterParams,
    useInboundView,
} from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";

import { TableProvider, useTableData } from "..";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter } = useInboundFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter,
        route: trpc.sales.customersIndex,
    });

    const { open } = useCustomerOverviewQuery();

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
                            open(rowData.phoneNo);
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
