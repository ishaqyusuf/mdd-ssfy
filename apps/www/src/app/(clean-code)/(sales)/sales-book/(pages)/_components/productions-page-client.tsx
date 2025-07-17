"use client";

import {
    DataTable,
    InfiniteDataTablePageProps,
} from "@/components/(clean-code)/data-table";

import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";
import { _modal } from "@/components/common/modal/provider";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { __filters } from "../../../_common/utils/contants";
import { Cells } from "./production-page-cells";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";

export default function ProductionsPageClient({
    filterFields,
    queryKey,
}: InfiniteDataTablePageProps) {
    // const filters =
    const table = useTableCompose({
        cells(ctx) {
            return [
                ctx.Column("Due Date", "date", Cells.Date),
                ctx.Column("", "alert", Cells.Alert),
                ctx.Column("Order #", "order.no", Cells.Order),
                ctx.Column("Customer", "customer", Cells.Customer),
                ctx.Column("Sales Rep", "sales.rep", Cells.SalesRep),
                ctx.Column("Assigned To", "assignments", Cells.Assignments),
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
        <div className="bg-white">
            <DataTable.Infinity
                checkable
                ActionCell={Cells.Action}
                queryKey={queryKey}
                itemViewFn={(item) => {
                    ctx.open2(item.uuid, "production-tasks");
                    // openSalesProductionModal({
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
                <DataTable.Header className="bg-white">
                    <div className="mb-2 flex items-end justify-between gap-2 sm:sticky">
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
                            {/* <DataTableFilterCommand /> */}
                            <MiddaySearchFilter
                                placeholder={"Search order information"}
                                filterList={filterFields}
                            />
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
