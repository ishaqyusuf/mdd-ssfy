"use client";

import { useTRPC } from "@/trpc/client";

import { TableProvider, useTableData } from "..";
import { Addon, columns, driverColumns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { BatchActions } from "./batch-actions";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function DataTable({ driver = false }) {
    const trpc = useTRPC();
    const { filters, setFilters } = useDispatchFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: filters,
        route: driver ? trpc.dispatch.assignedDispatch : trpc.dispatch.index,
    });
    const { setParams: setSalesPreviewParams } = useSalesPreview();
    const { data: drivers } = useQuery(trpc.hrm.getDrivers.queryOptions({}));
    useEffect(() => {
        console.log(drivers);
    }, [drivers]);
    const addons: Addon = {
        drivers: drivers || [],
    };
    return (
        <TableProvider
            args={[
                {
                    addons,
                    columns: driver ? driverColumns : columns,
                    data,
                    checkbox: true,
                    tableMeta: {
                        deleteAction(id) {
                            // deleteStudent.execute({
                            //   studentId: id,
                            // });
                        },
                        rowClick(id, rowData) {
                            setSalesPreviewParams({
                                previewMode: "packing list",
                                salesPreviewSlug: rowData?.order?.orderId,
                                salesPreviewType: "order",
                                dispatchId: id,
                            });
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
                {!hasNextPage || (
                    <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
                )}
                <BatchActions />
            </div>
        </TableProvider>
    );
}
