"use client";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

export function ProductionAlertWidget() {
    const { params } = useSalesDashboardParams();
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getKpis.queryOptions({
            from: params.from,
            to: params.to,
        }),
    );
    const lowStockVariants = [...Array(5)].map((a, id) => ({
        id,
        name: `0445${id}PC`,
        stock: 5,
    }));
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

    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Due Today
                </CardTitle>
                <CardDescription className="text-orange-700">
                    The following are due for production today:
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 flex gap-4 items-center">
                    {lowStockVariants.slice(0, 3).map((variant) => (
                        <div key={variant.id} className="flex">
                            <Badge
                                variant="outline"
                                className="text-orange-700 border-orange-300 text-base font-medium"
                            >
                                <span className="font-medium">
                                    {variant.name}
                                </span>
                                {/* View */}
                            </Badge>
                        </div>
                    ))}
                    {lowStockVariants.length > 3 && (
                        <p className="text-sm text-orange-600 font-bold">
                            +{lowStockVariants.length - 3} more items
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

