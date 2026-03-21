"use client";

import {
    useInboundFilterParams,
    useInboundView,
} from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";

import { Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter } = useInboundFilterParams();
    const { data, ref: loadMoreRef, hasNextPage } = useTableData({
        filter,
        route: trpc.sales.customersIndex,
    });

    const { open } = useCustomerOverviewQuery();

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
                            open(rowData.phoneNo);
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
