"use client";

import QueryTab from "@/app/(clean-code)/_common/query-tab";
import { QueryTabAction } from "@/app/(clean-code)/_common/query-tab/query-tab-edit";
import { DataTable } from "@/components/(clean-code)/data-table";
import { DataTableFilterCommand } from "@/components/(clean-code)/data-table/filter-command";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";

import { DispatchOverviewSheet } from "../../../_common/_components/overview-sheet.bin/order-overview-sheet";
import { openDispatchModal } from "../../../_common/_components/sales-overview-sheet.bin";
import { __filters } from "../../../_common/utils/contants";
import { DispatchCells } from "./dispatch-page-cells";

interface Props {
    queryKey?;
    filterFields;
}
export default function DispatchPageClient({ queryKey, filterFields }: Props) {
    const table = useTableCompose({
        cells(ctx) {
            return [
                ctx.Column("Date", "date", DispatchCells.Date),
                ctx.Column(
                    "Dispatch #",
                    "dispatchId",
                    DispatchCells.DispatchId,
                ),
                ctx.Column("Order #", "orderId", DispatchCells.Order),
                ctx.Column(
                    "Dispatch Mode",
                    "orderId",
                    DispatchCells.DispatchMode,
                ),
                ctx.Column("Address", "address", DispatchCells.Address),
                ctx.Column("Created By", "rep", DispatchCells.SalesRep),
                ctx.Column(
                    "Assigned To",
                    "dispatcher",
                    DispatchCells.Dispatcher,
                ),
                ctx.Column("Status", "status", DispatchCells.Status),
                ...__filters()["sales-delivery"].filterColumns,
            ];
        },
        checkable: true,
        filterFields,
        cellVariants: {
            size: "sm",
        },
        passThroughProps: {},
    });

    return (
        <div className="bg-white">
            <DataTable.Infinity
                checkable
                ActionCell={DispatchCells.Action}
                queryKey={queryKey}
                {...table.props}
                itemViewFn={(item) => {
                    openDispatchModal({
                        salesId: item.order.id,
                        shippingId: item.id,
                    });
                }}
            >
                <DataTable.Header top="lg" className="bg-white">
                    <div className="mb-2 flex items-end justify-between gap-2 sm:sticky">
                        <div className="">
                            <QueryTab page="orders" />
                        </div>
                        <div className="flex-1"></div>
                        <QueryTabAction />
                    </div>
                    <div className="flex justify-between">
                        <div className="flex-1">
                            <DataTableFilterCommand />
                        </div>
                        <DataTableInfinityToolbar />
                    </div>
                </DataTable.Header>
                <DataTable.Table />
                <DataTable.LoadMore />
                <DispatchOverviewSheet />
            </DataTable.Infinity>
        </div>
    );
}
