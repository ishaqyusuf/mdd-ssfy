"use client";
import { OrderSearchFilter } from "./sales-order-search-filter";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
import { SalesOrderExport } from "./sales-order-export";

export function OrderHeader({}) {
    return (
        <div className="flex gap-4">
            <OrderSearchFilter />
            <div className="flex-1"></div>
            <SalesOrderExport />
            <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button>
        </div>
    );
}

