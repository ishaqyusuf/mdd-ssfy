"use client";

import Link from "@/components/link";
import { Icons } from "@gnd/ui/icons";

import { Button } from "@gnd/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@gnd/ui/card";

export function SalesRepSalesWidgetHeader() {
    // const { setParams } = useInvoiceParams();

    return (
        <CardHeader className="fflex flex-row items-center justify-between">
            <div className="">
                <Link href="/sales-book/orders/v2" prefetch>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                        Your most recent sales proposals
                    </CardDescription>
                </Link>
            </div>

            <Button variant="outline" size="icon" asChild>
                <Link href="/sales-book/create-order">
                    <Icons.add />
                </Link>
            </Button>
        </CardHeader>
    );
}
