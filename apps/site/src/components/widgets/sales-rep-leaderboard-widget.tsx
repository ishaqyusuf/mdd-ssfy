"use client";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { useQuery } from "@tanstack/react-query";

export function SalesRepLeaderboardWidget() {
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getSalesRepLeaderboard.queryOptions(),
    );
    if (isLoading) return <div>Loading...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales Rep Leaderboard</CardTitle>
                <CardDescription>
                    Top performers in the last 30 days.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {data?.map((rep) => (
                    <div className="flex items-center" key={rep.id}>
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
            </CardContent>
        </Card>
    );
}

