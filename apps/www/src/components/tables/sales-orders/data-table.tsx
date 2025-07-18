"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider, useTableData } from "..";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";
import { useSalesPreview } from "@/hooks/use-sales-preview";

import { useOrderFilterParams } from "@/hooks/use-order-filter-params";
import { BatchActions } from "./batch-actions";

export function DataTable() {
    const trpc = useTRPC();
    const { filters } = useOrderFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.sales.index,
    });
    const { setParams: setSalesPreviewParams } = useSalesPreview();

    return (
        <TableProvider
            args={[
                {
                    columns,
                    data,
                    checkbox: true,
                    tableMeta: {
                        rowClick(id, rowData) {
                            setSalesPreviewParams({
                                salesPreviewSlug: rowData?.orderId,
                                salesPreviewType: "order",
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
                {hasNextPage && (
                    <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
                )}
                <BatchActions />
            </div>
        </TableProvider>
    );
}

