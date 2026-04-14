"use client";

import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";

export function InventoryStockAlertWidget() {
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.inventories.lowStockSummary.queryOptions(),
    );
    if (isLoading) {
        return <InventoryStockAlertWidgetSkeleton />;
    }
    if (!data?.total) {
        return null;
    }
    const lowStockVariants = data?.items || [];

    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                    <Icons.AlertTriangle className="w-5 h-5" />
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
                            className="flex justify-between items-center gap-4"
                        >
                            <div className="min-w-0">
                                <div className="font-medium truncate">
                                    {variant.inventoryName}
                                </div>
                                {variant.variantTitle ? (
                                    <div className="text-sm text-orange-700 truncate">
                                        {variant.variantTitle}
                                    </div>
                                ) : null}
                            </div>
                            <Badge
                                variant="outline"
                                className="text-orange-700 border-orange-300 shrink-0"
                            >
                                {variant.qty} left
                            </Badge>
                        </div>
                    ))}
                    {lowStockVariants.length > 3 && (
                        <p className="text-sm text-orange-600">
                            +{lowStockVariants.length - 3} more items
                        </p>
                    )}
                </div>
                {data?.total && data.total > 3 ? (
                    <p className="mt-3 text-sm text-orange-600">
                        {data.total} monitored variants need restocking.
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

export function InventoryStockAlertWidgetSkeleton() {
    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                    <Icons.AlertTriangle className="w-5 h-5" />
                    Low Stock Alert
                </CardTitle>
                <div className="text-sm text-orange-700">
                    <Skeleton className="h-4 w-64 bg-orange-100" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div
                            key={`stock-skeleton-${index}`}
                            className="flex items-center justify-between gap-4"
                        >
                            <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-4 w-40 bg-orange-100" />
                                <Skeleton className="h-4 w-28 bg-orange-100" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full bg-orange-100" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
