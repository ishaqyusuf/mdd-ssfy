"use client";

import React, { use } from "react";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { Table, TableBody } from "@gnd/ui/table";

import { TableProvider } from "../tables";
import { TableHeaderComponent } from "../tables/table-header";
import { TableRow } from "../tables/table-row";

import { useEmployeesParams } from "@/hooks/use-employee-params";
import { PageFilterData } from "@/types/type";
import { columns, Item } from "./resolution-center-content";
import { LoadMore } from "../tables/load-more";
import FContentShell from "@/components/(clean-code)/fikr-ui/f-content-shell";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
import { Badge } from "@gnd/ui/badge";
import { AlertTriangle } from "lucide-react";

type Props = {
    data: Item[];
    loadMore: (query) => Promise<any>;
    pageSize: number;
    nextMeta;
    filterDataPromise;
    count;
};

export function DataTable({
    data,
    loadMore,
    pageSize,
    nextMeta,
    filterDataPromise,
    count,
}: Props) {
    const filterData: PageFilterData[] = filterDataPromise
        ? use(filterDataPromise)
        : [];

    const { params, setParams } = useResolutionCenterParams();
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
                        rowClassName: "hover:bg-transparent",
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
                <FContentShell>
                    <div className="flex">
                        <MiddaySearchFilter
                            placeholder={"Search"}
                            filterList={filterData}
                        />
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-4">
                            <Badge variant="destructive" className="text-sm">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                {count} Conflicts
                            </Badge>
                        </div>
                    </div>
                </FContentShell>
                <Table>
                    <TableBody>
                        <TableRow />
                    </TableBody>
                </Table>
                <LoadMore />
            </div>
        </TableProvider>
    );
}
