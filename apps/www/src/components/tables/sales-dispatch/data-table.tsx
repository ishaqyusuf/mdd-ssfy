"use client";

import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import { Addon, columns, driverColumns, mobileColumn } from "./columns";
import { BatchActions } from "./batch-actions";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useDriversList } from "@/hooks/use-data-list";

export function DataTable({ driver = false }) {
    const trpc = useTRPC();
    const { filters, setFilters } = useDispatchFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: filters,
        route: driver ? trpc.dispatch.assignedDispatch : trpc.dispatch.index,
    });
    // const { setParams: setSalesPreviewParams } = useSalesPreview();
    const drivers = useDriversList(true);
    // const ctx = use
    const addons: Addon = {
        drivers: drivers || [],
        driverMode: !!driver,
    };
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const ctx = useSalesOverviewQuery();
    return (
        <Table.Provider
            args={[
                {
                    addons,
                    columns: driver ? driverColumns : columns,
                    data,
                    mobileColumn: driver ? null : mobileColumn,
                    checkbox: true,
                    tableScroll,
                    tableMeta: {
                        deleteAction(id) {
                            // deleteStudent.execute({
                            //   studentId: id,
                            // });
                        },
                        rowClick(id, rowData) {
                            ctx.openDispatch(
                                rowData?.order?.orderId,
                                rowData.id,
                                "packing",
                            );
                            // setSalesPreviewParams({
                            //     previewMode: "packing list",
                            //     salesPreviewSlug: rowData?.order?.orderId,
                            //     salesPreviewType: "order",
                            //     dispatchId: id,
                            // });
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4">
                <Table>
                    <Table.TableHeader />
                    <Table.Body>
                        <Table.TableRow />
                    </Table.Body>
                </Table>
                <Table.LoadMore />
                <BatchActions />
            </div>
        </Table.Provider>
    );
}
