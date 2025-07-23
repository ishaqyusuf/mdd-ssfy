"use client";
import { useTRPC } from "@/trpc/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { useQuery } from "@tanstack/react-query";

export function TopProductsWidget() {
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getTopProducts.queryOptions(),
    );

    if (isLoading) return <div>Loading...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>
                    Based on sales volume in the last 30 days.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {data?.map((product) => (
                        <li key={product.name} className="flex justify-between">
                            <span className="text-sm font-medium">
                                {product.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {product.count} units
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

