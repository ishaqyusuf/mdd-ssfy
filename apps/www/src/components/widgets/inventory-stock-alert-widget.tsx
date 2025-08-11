"use client";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, CreditCard, List, Activity } from "lucide-react";

export function InventoryStockAlertWidget() {
    const { params } = useSalesDashboardParams();
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getKpis.queryOptions({
            from: params.from,
            to: params.to,
        }),
    );

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Add Skeleton Loaders here */}
                <Card>
                    <CardHeader>
                        <CardTitle>Loading...</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"></div>;
}

