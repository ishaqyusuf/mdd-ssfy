"use client";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";
import { WidgetListSkeleton } from "./widget-skeleton";
import { Skeleton } from "@gnd/ui/skeleton";

export function TopProductsWidget() {
    const trpc = useTRPC();
    const { params } = useSalesDashboardParams();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getTopProducts.queryOptions({
            from: params.from,
            to: params.to,
        }),
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
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>
                    Based on sales volume in the last 30 days.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="bullet-none divide-y cursor-pointer overflow-auto scrollbar-hide aspect-square pb-32 mt-4">
                    {data?.map((product) => {
                        return (
                            <li
                                key={product.name}
                                className="h-[57px] items-center flex w-full"
                            >
                                <div className="w-3/5">
                                    <span className="text-sm font-medium uppercase">
                                        {product.name}
                                    </span>
                                </div>
                                <div className="flex-1"></div>
                                <span className="text-sm text-muted-foreground text-end">
                                    {product.count} units
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </CardContent>
        </Card>
    );
}

