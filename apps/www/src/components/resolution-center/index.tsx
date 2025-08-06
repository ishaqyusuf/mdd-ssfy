"use client";
import { TableProvider, useTableData } from "../tables";
import { useTRPC } from "@/trpc/client";
import { useResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { columns } from "./resolution-center-content";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../tables/table-header";
import { TableRow } from "../tables/table-row";
import { LoadMoreTRPC } from "../tables/load-more";

export function ResolutionCenter({}) {
    const { filters } = useResolutionCenterFilterParams();
    const trpc = useTRPC();
    const { hasNextPage, ref, data } = useTableData({
        filter: filters,
        route: trpc.sales.getSalesResolutions,
    });

    return (
        <TableProvider
            args={[
                {
                    columns: columns,
                    //mobileColumn: mobileColumn,
                    data,
                    //checkbox: true,
                    //tableScroll,
                    //rowSelection,
                    //setRowSelection,
                    tableMeta: {
                        //rowClick(id, rowData) {},
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                <div
                    // {/* ref={tableScroll.containerRef} */}
                    className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                >
                    <Table>
                        <TableBody>
                            <TableRow />
                        </TableBody>
                    </Table>
                </div>
                {hasNextPage && (
                    <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
                )}
                {/* <BatchActions /> */}
            </div>
        </TableProvider>
    );
}
