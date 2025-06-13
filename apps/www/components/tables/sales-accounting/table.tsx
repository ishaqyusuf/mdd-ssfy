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
import FPageContent from "@/components/(clean-code)/fikr-ui/f-page-content";
import FContentShell from "@/components/(clean-code)/fikr-ui/f-content-shell";
import { Menu } from "@/components/(clean-code)/menu";
import { Icons } from "@/components/_v1/icons";
import { useRolesParams } from "@/hooks/use-roles-params";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";

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
    const role = useRolesParams();
    const toast = useLoadingToast();
    //   const deleteEmployee = useAction(deleteStudentAction, {
    //     onSuccess(args) {
    //       toast.success("Deleted!", {
    //         variant: "destructive",
    //       });
    //     },
    //     onError(e) {},
    //   });
    const txView = useTransactionOverviewModal();
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
                            txView.viewTx(rowData?.id);
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4">
                <FContentShell>
                    <div className="flex">
                        <MiddaySearchFilter
                            placeholder={"Search"}
                            filterList={filterData}
                        />
                        <div className="flex-1"></div>
                    </div>
                </FContentShell>
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
