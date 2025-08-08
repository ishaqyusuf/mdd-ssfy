"use client";

import { __filters } from "@/app/(clean-code)/(sales)/_common/utils/contants";
import {
    DataTable,
    InfiniteDataTablePageProps,
} from "@/components/(clean-code)/data-table";
import { DataTableFilterCommand } from "@/components/(clean-code)/data-table/filter-command";
import { BatchBtn } from "@/components/(clean-code)/data-table/infinity/batch-action";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";
import { Menu } from "@/components/(clean-code)/menu";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";

import {
    ActionCell,
    AmountPaidCell,
    DateCell,
    DescriptionCell,
    OrderIdCell,
    PaymentAuthorCell,
    SalesRepCell,
    StatusCell,
} from "./columns";

export default function SalesAccountingTable({
    filterFields,
    queryKey,
}: InfiniteDataTablePageProps) {
    const txView = useTransactionOverviewModal();
    const table = useTableCompose({
        cells(ctx) {
            return [
                ctx.Column("Date", "date", DateCell),
                ctx.Column("Total", "total", AmountPaidCell),
                ctx.Column("Description", "description", DescriptionCell),
                ctx.Column("Order #", "order_ids", OrderIdCell),
                ctx.Column("Sales Rep", "sale_rep", SalesRepCell),
                ctx.Column("Processed By", "recieved_by", PaymentAuthorCell),
                ctx.Column("Status", "status", StatusCell),
                // ...__filters()["sales-accounting"]?.filterColumns,
                // ctx.Column("Order #", "orderNo", Cells.Order),
                // ctx.Column("Sales Rep", "sales.rep", Cells.SalesRep),
                // // ctx.Column("Assigned To", "assignments", Cells.Assignments),
                // ctx.Column("Status", "status", Cells.Status),
                // ...__filters()["sales-productions"].filterColumns,
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

    return (
        <div className="bg-white">
            <DataTable.Infinity
                checkable
                ActionCell={ActionCell}
                queryKey={queryKey}
                itemViewFn={(item) => {
                    // openSalesCustomerTx(item.id);
                    txView.viewTx(item?.id);
                }}
                {...table.props}
            >
                <DataTable.BatchAction>
                    <BatchBtn
                        menu={
                            <>
                                <Menu.Trash action={() => {}}>
                                    Delete
                                </Menu.Trash>
                            </>
                        }
                    >
                        Status
                    </BatchBtn>
                </DataTable.BatchAction>
                <DataTable.Header top="sm" className="bg-white">
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
                            <MiddaySearchFilter
                                placeholder={"Search sales information..."}
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
