"use client";
import { OrderSearchFilter } from "./sales-order-search-filter";
import { SalesOrderExport } from "./sales-order-export";
import { SalesCustomTab } from "./sales-custom-tab";
import { CreateSalesBtn } from "./create-sales-btn";

export function OrderHeader({}) {
    return (
        <div className="flex gap-4">
            <OrderSearchFilter />
            <SalesCustomTab />
            <div className="flex-1"></div>
            {/* <Table.SummarySlot /> */}
            <SalesOrderExport />
            <CreateSalesBtn />
        </div>
    );
}

