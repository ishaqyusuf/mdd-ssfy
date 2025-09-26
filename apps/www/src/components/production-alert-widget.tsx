"use client";
import { useAuth } from "@/hooks/use-auth";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

export function ProductionAlertWidget() {
    const { params } = useSalesDashboardParams();
    const trpc = useTRPC();
    const auth = useAuth();
    const { data, isLoading } = useQuery(
        trpc.sales.productions.queryOptions({
            show: "past-due",
            // show: "due-today",
            workerId: auth.id,
        }),
    );
    const dues = data?.data || [];
    const empty = !data?.data?.length;
    const overviewQuery = useSalesOverviewQuery();
    if (isLoading) {
        return (
            <div className="">
                <Skeletons.Stats />
            </div>
        );
    }

    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Productions Due Today
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!empty || <span>No productions due today</span>}

                <div className="flex-wrap flex gap-4 items-center">
                    {dues.slice(0, 10).map((variant) => (
                        <div key={variant.id} className="flex">
                            <Button
                                onClick={(e) => {
                                    overviewQuery.open2(
                                        variant.uuid,
                                        "production-tasks",
                                    );
                                }}
                                variant="outline"
                                className="text-orange-700 border-orange-300 text-base font-medium"
                            >
                                <span className="font-medium">
                                    {variant.orderId}
                                </span>
                                {/* View */}
                            </Button>
                        </div>
                    ))}
                    {dues.length > 10 && (
                        <p className="text-sm text-orange-600 font-bold">
                            +{dues.length - 10} more items
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

