"use client";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";
import { InvoiceRow } from "./sales/sales-row";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { WidgetListSkeleton } from "./widget-skeleton";
import { Skeleton } from "@gnd/ui/skeleton";

export function RecentSalesWidget() {
    const { params } = useSalesDashboardParams();
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getRecentSales.queryOptions(),
    );
    if (isLoading)
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        <Skeleton className="h-[32px] w-[56px]" />
                    </CardTitle>
                    <CardDescription>
                        <Skeleton className="h-[16px] w-[56px]" />
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="bullet-none divide-y cursor-pointer overflow-auto scrollbar-hide aspect-square pb-32 mt-4">
                        <WidgetListSkeleton />
                    </ul>
                </CardContent>
            </Card>
        );
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                    You made {data?.length} sales recently.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <ul className="bullet-none divide-y cursor-pointer overflow-auto scrollbar-hide aspect-square pb-32 mt-4">
                    {data?.map((invoice) => {
                        return (
                            <InvoiceRow key={invoice.id} invoice={invoice} />
                        );
                    })}
                </ul>
                {/* {data?.map((sale) => (
                    <div className="flex items-center" key={sale.id}>
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>
                                {sale.customerName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {sale.customerName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {sale.orderId}
                            </p>
                        </div>
                        <div className="ml-auto font-medium">
                            +${sale.amount.toLocaleString()}
                        </div>
                    </div>
                ))} */}
            </CardContent>
        </Card>
    );
}

