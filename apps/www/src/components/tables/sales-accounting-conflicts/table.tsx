"use client";

import React, { use } from "react";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Table } from "@gnd/ui/data-table";

import { useEmployeeParams } from "@/hooks/use-employee-params";
import { PageFilterData } from "@/types/type";
import { columns, Item, mobileColumn } from "./columns";
import FContentShell from "@/components/(clean-code)/fikr-ui/f-content-shell";
import { useRolesParams } from "@/hooks/use-roles-params";
import { _perm } from "@/components/sidebar/links";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import { SuperAdminGuard } from "@/components/auth-guard";
import { Button } from "@gnd/ui/button";
import Link from "@/components/link";

type Props = {
    data: Item[];
    filterDataPromise;
};

export function DataTable({
    data,
    filterDataPromise,
}: Props) {
    const { setParams, params } = useEmployeeParams();
    const filterData: PageFilterData[] = filterDataPromise
        ? use(filterDataPromise)
        : [];
    const role = useRolesParams();
    const toast = useLoadingToast();
    const txView = useTransactionOverviewModal();
    return (
        <Table.Provider
            args={[
                {
                    columns,
                    mobileColumn,
                    data,
                    tableMeta: {
                        deleteAction(id) {},
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
                        <SuperAdminGuard>
                            <Button asChild>
                                <Link href="/sales-book/accounting-conflicts">
                                    Resolve Conflicts
                                </Link>
                            </Button>
                        </SuperAdminGuard>
                    </div>
                </FContentShell>
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
