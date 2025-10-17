"use client";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
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

export function SalesRepLeaderboardWidget() {
    const trpc = useTRPC();
    const { params } = useSalesDashboardParams();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getSalesRepLeaderboard.queryOptions({
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
                <CardTitle>Sales Rep Leaderboard</CardTitle>
                <CardDescription>
                    Top performers in the last 30 days.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="bullet-none divide-y cursor-pointer overflow-auto scrollbar-hide aspect-square pb-32 mt-4">
                    {data?.map((rep) => (
                        <div
                            className="flex items-center h-[57px]"
                            key={rep.id}
                        >
                            <Avatar className="h-9 w-9">
                                <AvatarFallback>
                                    {rep.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {rep.name}
                                </p>
                            </div>
                            <div className="ml-auto font-medium">
                                ${rep.totalSales.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

