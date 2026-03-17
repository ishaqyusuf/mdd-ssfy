"use client";

import React, { use } from "react";
import { Table } from "@gnd/ui/data-table";

import { useEmployeeParams } from "@/hooks/use-employee-params";
import { PageFilterData } from "@/types/type";
import { customerTransactionsColumn, Item } from "./columns";
import { _perm } from "@/components/sidebar/links";

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
    const { setParams, params } = useEmployeeParams();
    const filterData: PageFilterData[] = filterDataPromise
        ? use(filterDataPromise)
        : [];
    return (
        <Table.Provider
            args={[
                {
                    columns: customerTransactionsColumn,
                    data,
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
                    <Table.TableHeader />
                    <Table.Body>
                        <Table.TableRow />
                    </Table.Body>
                </Table>
            </div>
        </Table.Provider>
    );
}
