"use client";

import {
    DataTable,
    InfiniteDataTablePageProps,
} from "@/components/(clean-code)/data-table";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";
import { _modal } from "@/components/common/modal/provider";
import { TaskProductionTabs } from "@/components/task-production-tabs";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { __filters } from "../../../_common/utils/contants";
import { Cells } from "./production-page-cells";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";

export default function ProductionTasksPageClient({
    filterFields,
    queryKey,
}: InfiniteDataTablePageProps) {
    // const filters =
    const table = useTableCompose({
        cells(ctx) {
            return [
                ctx.Column("Due Date", "date", Cells.Date),
                ctx.Column("Assigned To", "assignedTo", Cells.AssignedTo),
                ctx.Column("Customer", "customer", Cells.Customer),
                ctx.Column("Order #", "orderNo", Cells.Order),
                ctx.Column("Sales Rep", "sales.rep", Cells.SalesRep),
                ctx.Column("Status", "status", Cells.Status),
            ];
        },
        filterFields,
        cellVariants: {
            size: "sm",
        },
        passThroughProps: {
            itemClick(item) {
                // _modal.openSheet();
            },
        },
    });
    const ctx = useSalesOverviewQuery();
    return (
        <div className="">
            <DataTable.Infinity
                checkable
                ActionCell={Cells.Action}
                queryKey={queryKey}
                itemViewFn={(item) => {
                    ctx.open2(item.uuid, "production-tasks");
                    // openSalesProductionTasksModal({
                    //     salesId: item.id,
                    // });
                }}
                {...table.props}
            >
                <DataTable.BatchAction>
                    {/* <Menu>
                        <Menu.Trash action={() => {}}>Delete</Menu.Trash>
                    </Menu> */}
                </DataTable.BatchAction>
                <DataTable.Header top="xs" className="bg-muted">
                    <div className="flex justify-between">
                        <div className="flex-1">
                            {/* <DataTableFilterCommand /> */}
                            <MiddaySearchFilter
                                placeholder={"Search order information"}
                                filterList={filterFields}
                            />
                        </div>
                        <DataTableInfinityToolbar />
                    </div>
                </DataTable.Header>
                <TaskProductionTabs />
                <DataTable.Table />
                <DataTable.LoadMore />
            </DataTable.Infinity>
        </div>
    );
}
