"use client";

import React, { use } from "react";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Table, TableBody } from "@gnd/ui/table";

import { TableProvider } from "..";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";

import { useEmployeesParams } from "@/hooks/use-employee-params";
import { PageFilterData } from "@/types/type";
import { columns, Item } from "./columns";
import { LoadMore } from "../load-more";
import FContentShell from "@/components/(clean-code)/fikr-ui/f-content-shell";
import { useRolesParams } from "@/hooks/use-roles-params";
import { _perm } from "@/components/sidebar/links";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import { AuthGuard, SuperAdminGuard } from "@/components/auth-guard";
import { Button } from "@gnd/ui/button";
import Link from "@/components/link";
import { isProdClient } from "@/lib/is-prod";

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
                        <AuthGuard rules={[_perm.is("viewSalesResolution")]}>
                            <Button>
                                <Link href="/sales-book/accounting/resolution-center">
                                    Resolution Center
                                </Link>
                            </Button>
                        </AuthGuard>
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
