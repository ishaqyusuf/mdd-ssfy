"use client";

import Link from "next/link";
import { Icons } from "@/components/_v1/icons";

import { Button } from "@gnd/ui/button";

export function SalesRepSalesWidgetHeader() {
    // const { setParams } = useInvoiceParams();

    return (
        <div className="flex items-center justify-between">
            <Link href="/invoices" prefetch>
                <h2 className="text-lg">Recent Sales</h2>
            </Link>

            <Button variant="outline" size="icon" onClick={() => {}}>
                <Icons.add />
            </Button>
        </div>
    );
}
