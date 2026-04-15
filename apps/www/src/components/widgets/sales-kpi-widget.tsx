"use client";

import { Icons } from "@gnd/ui/icons";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import type { SalesDashboardParamsState } from "@/hooks/use-sales-dashboard-params";

type SalesKpiData = {
    totalRevenue: number;
    totalDue: number;
    newSales: number;
    newQuotes: number;
};

export function SalesKpiWidgets({
    initialData,
    initialParams,
}: {
    initialData?: SalesKpiData;
    initialParams?: Pick<SalesDashboardParamsState, "from" | "to">;
}) {
    const { params } = useSalesDashboardParams();
    const effectiveParams = initialParams ?? params;
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getKpis.queryOptions(
            {
                from: effectiveParams.from,
                to: effectiveParams.to,
            },
            initialData
                ? {
                      initialData,
                  }
                : undefined,
        ),
    );
    if (isLoading) {
        return <SalesKpiWidgetsSkeleton />;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Sales
                    </CardTitle>
                    <Icons.DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${data?.totalRevenue.toLocaleString()}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Amount Due
                    </CardTitle>
                    <Icons.Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${data?.totalDue.toLocaleString()}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        New Sales
                    </CardTitle>
                    <Icons.CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+{data?.newSales}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        New Quotes
                    </CardTitle>
                    <Icons.List className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+{data?.newQuotes}</div>
                </CardContent>
            </Card>
        </div>
    );
}

export function SalesKpiWidgetsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((a, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            <Skeleton className="h-[20px] w-24"></Skeleton>
                        </CardTitle>
                        <Icons.CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[32px] w-24"></Skeleton>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
