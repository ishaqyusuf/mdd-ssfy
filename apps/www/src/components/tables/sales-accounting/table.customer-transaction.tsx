"use client";

import React, { use } from "react";
import { Table, TableBody } from "@gnd/ui/table";

import { TableProvider } from "..";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";

import { useEmployeesParams } from "@/hooks/use-employee-params";
import { PageFilterData } from "@/types/type";
import { customerTransactionsColumn, Item } from "./columns";
import { _perm } from "@/components/sidebar/links";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";

type Props = {
    data: Item[];
    loadMore?: (query) => Promise<any>;
    pageSize?: number;
    nextMeta?;
    filterDataPromise?;
};

export function CustomerTxDataTable({
    data,
    loadMore,
    pageSize,
    nextMeta,
    filterDataPromise,
}: Props) {
    const { setParams, params } = useEmployeesParams();
    const filterData: PageFilterData[] = filterDataPromise
        ? use(filterDataPromise)
        : [];
    return (
        <TableProvider
            args={[
                {
                    columns: customerTransactionsColumn,
                    data,
                    nextMeta,
                    loadMore,
                    pageSize,
                    setParams,
                    params,
                    tableMeta: {
                        filterData,
                        deleteAction(id) {
                            //   deleteStudent.execute({
                            //     studentId: id,
                            //   });
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
            </div>
        </TableProvider>
    );
}
