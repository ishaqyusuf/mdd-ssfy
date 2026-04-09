"use client";

import { Icons } from "@gnd/ui/icons";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTRPC } from "@/trpc/client";
import { useResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { columns } from "./resolution-center-content";
import Portal from "../_v1/portal";
import { Badge } from "@gnd/ui/badge";

export function ResolutionCenter({}) {
    const { filters } = useResolutionCenterFilterParams();
    const trpc = useTRPC();
    const {
        hasNextPage,
        queryData,
        ref: loadMoreRef,
        data,
    } = useTableData({
        filter: filters,
        route: trpc.sales.getSalesResolutions,
    });

    return (
        <Table.Provider
            args={[
                {
                    columns,
                    data,
                    props: { loadMoreRef, hasNextPage },
                    tableMeta: {},
                },
            ]}
        >
            <Portal nodeId={"resolutionHeaderActions"}>
                <div className="flex items-center gap-4">
                    <Badge variant="destructive" className="text-sm">
                        <Icons.AlertTriangle className="h-4 w-4 mr-1" />
                        {(queryData?.pages?.[0] as any)?.meta?.count} Conflicts
                    </Badge>
                </div>
            </Portal>
            <div className="flex flex-col gap-4 w-full">
                <Table>
                    <Table.Body>
                        <Table.TableRow />
                    </Table.Body>
                </Table>
                <Table.LoadMore />
            </div>
        </Table.Provider>
    );
}
