"use client";

import { DataTable } from "@/components/(clean-code)/data-table";
import { DataTableFilterCommand } from "@/components/(clean-code)/data-table/filter-command";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";

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
                    <div className="flex justify-between">
                        <div className="flex-1">
                            <DataTableFilterCommand />
                        </div>
                        <DataTableInfinityToolbar />
                    </div>
                </DataTable.Header>
                <DataTable.Table />
                <DataTable.LoadMore />
            </DataTable.Infinity>
        </div>
    );
}
