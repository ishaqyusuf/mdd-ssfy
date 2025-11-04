"use client";
import { OrderSearchFilter } from "./sales-order-search-filter";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
import { SalesOrderExport } from "./sales-order-export";
import { Table } from "@gnd/ui/data-table";
import Portal from "@gnd/ui/custom/portal";
import { Tabs } from "@gnd/ui/composite";
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

