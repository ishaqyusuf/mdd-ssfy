"use client";

import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";
import { useTRPC } from "@/trpc/client";

import { TableProvider, useTableData } from "..";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { BatchActions } from "./batch-actions";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter } = useDispatchFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter,
        route: trpc.dispatch.index,
    });
    const { setParams: setSalesPreviewParams } = useSalesPreview();
    return (
        <TableProvider
            args={[
                {
                    columns: columns,
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
