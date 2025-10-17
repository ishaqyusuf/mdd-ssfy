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
import { useQuery } from "@gnd/ui/tanstack";
import {
    DollarSign,
    CreditCard,
    List,
    Activity,
    AlertTriangle,
} from "lucide-react";

export function InventoryStockAlertWidget() {
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
        name: "",
        stock: "",
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
                    Low Stock Alert
                </CardTitle>
                <CardDescription className="text-orange-700">
                    The following items are running low on stock:
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {lowStockVariants.slice(0, 3).map((variant) => (
                        <div
                            key={variant.id}
                            className="flex justify-between items-center"
                        >
                            <span className="font-medium">{variant.name}</span>
                            <Badge
                                variant="outline"
                                className="text-orange-700 border-orange-300"
                            >
                                {variant.stock} left
                            </Badge>
                        </div>
                    ))}
                    {lowStockVariants.length > 3 && (
                        <p className="text-sm text-orange-600">
                            +{lowStockVariants.length - 3} more items
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

