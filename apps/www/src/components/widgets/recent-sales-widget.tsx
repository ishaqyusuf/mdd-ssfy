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
import { useQuery } from "@tanstack/react-query";

export function RecentSalesWidget() {
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getRecentSales.queryOptions(),
    );
    if (isLoading) return <div>Loading...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                    You made {data?.length} sales recently.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {data?.map((sale) => (
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
                ))}
            </CardContent>
        </Card>
    );
}

