"use client";

import Link from "next/link";
import QueryTab from "@/app/(clean-code)/_common/query-tab";
import { QueryTabAction } from "@/app/(clean-code)/_common/query-tab/query-tab-edit";
import {
    DataTable,
    InfiniteDataTablePageProps,
} from "@/components/(clean-code)/data-table";
import { DataTableFilterCommand } from "@/components/(clean-code)/data-table/filter-command";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";
import { _modal } from "@/components/common/modal/provider";
import { TaskProductionTabs } from "@/components/task-production-tabs";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { Badge } from "@gnd/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import {
    openSalesProductionModal,
    openSalesProductionTasksModal,
} from "../../../_common/_components/sales-overview-sheet.bin";
import { __filters } from "../../../_common/utils/contants";
import { Cells } from "./production-page-cells";

export default function ProductionTasksPageClient({
    filterFields,
    queryKey,
}: InfiniteDataTablePageProps) {
    // const filters =
    const table = useTableCompose({
        cells(ctx) {
            return [
                ctx.Column("Due Date", "date", Cells.Date),
                ctx.Column("Customer", "customer", Cells.Customer),
                ctx.Column("Order #", "order.no", Cells.Order),
                ctx.Column("Sales Rep", "sales.rep", Cells.SalesRep),
                // ctx.Column("Assigned To", "assignments", Cells.Assignments),
                ctx.Column("Status", "status", Cells.Status),
                ...__filters()["sales-productions"].filterColumns,
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
        <div className="bg-white">
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
                <DataTable.Header top="sm" className="bg-white">
                    <div className="mb-2 flex items-end justify-between gap-2 sm:sticky">
                        <div className="">
                            <QueryTab page="orders" />
                        </div>
                        <div className="flex-1"></div>
                        <QueryTabAction />
                        {/* <Button
                            onClick={() => {
                                openTxForm({});
                            }}
                            variant="destructive"
                            size="sm"
                        >
                            <Icons.dollar className="size-4 mr-2" />
                            <span>Pay Portal</span>
                        </Button>
                        <Button asChild size="sm">
                            <Link href="/sales-book/create-order">
                                <Icons.add className="size-4 mr-2" />
                                <span>New</span>
                            </Link>
                        </Button> */}
                    </div>
                    <div className="flex justify-between">
                        <div className="flex-1">
                            <DataTableFilterCommand />
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
