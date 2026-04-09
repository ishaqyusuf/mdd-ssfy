"use client";

import { Icons } from "@gnd/ui/icons";
import { useJobsKpi } from "@/hooks/use-jobs-kpi";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";

export function JobsKpiWidget() {
    const { params } = useSalesDashboardParams();

    const {
        totalCustomJobs,
        totalCustomJobsAmount,
        totalJobs,
        totalJobsAmount,
        totalPendingReviews,
        isLoading,
    } = useJobsKpi();
    if (isLoading) {
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

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Jobs
                    </CardTitle>
                    <Icons.DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {/* ${data?.totalRevenue.toLocaleString()} */}
                        {totalJobs}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Custom Jobs
                    </CardTitle>
                    <Icons.Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {/* ${data?.totalDue.toLocaleString()} */}
                        {totalCustomJobs}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Pending Reviews
                    </CardTitle>
                    <Icons.CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {totalPendingReviews}
                    </div>
                </CardContent>
            </Card>
            <Card className="group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Costs
                    </CardTitle>
                    <Icons.List className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        <span className="group-hover:hidden">*******</span>
                        <span className="hidden group-hover:inline">
                            {/* +{data?.newQuotes} */}$
                            {totalJobsAmount.toLocaleString()}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
