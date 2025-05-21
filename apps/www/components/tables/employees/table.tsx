"use client";

import React, { use } from "react";

import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";

import { useAction } from "next-safe-action/hooks";

import { Button } from "@gnd/ui/button";
import { Table, TableBody } from "@gnd/ui/table";

import { TableProvider } from "..";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";

import { useEmployeesParams } from "@/hooks/use-employee-params";
import { PageFilterData } from "@/types/type";
import { columns, Item } from "./columns";
import { LoadMore } from "../load-more";

type Props = {
    data: Item[];
    loadMore: (query) => Promise<any>;
    pageSize: number;
    nextMeta;
    filterDataPromise;
};

export function DataTable({
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

    const toast = useLoadingToast();
    //   const deleteEmployee = useAction(deleteStudentAction, {
    //     onSuccess(args) {
    //       toast.success("Deleted!", {
    //         variant: "destructive",
    //       });
    //     },
    //     onError(e) {},
    //   });
    return (
        <TableProvider
            args={[
                {
                    columns,
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
                        rowClick(id, rowData) {
                            setParams({
                                employeeViewId: Number(id),
                            });
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4">
                <div className="flex">
                    <MiddaySearchFilter
                        placeholder={"Search"}
                        filterList={filterData}
                    />
                    <div className="flex-1"></div>
                    <Button
                        variant="outline"
                        onClick={() =>
                            setParams({
                                createEmployee: true,
                            })
                        }
                    >
                        Create
                    </Button>
                </div>
                <Table>
                    <TableHeaderComponent />

                    <TableBody>
                        <TableRow />
                    </TableBody>
                </Table>
                <LoadMore />
            </div>
        </TableProvider>
    );
}
