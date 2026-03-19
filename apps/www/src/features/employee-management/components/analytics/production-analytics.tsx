"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { ProductionAnalytics as ProductionAnalyticsType } from "../../types";
import { OverviewStatCard } from "../shared/overview-stat-card";
import { CheckCircle, Clock, Package, Layers } from "lucide-react";

interface Props {
    data: ProductionAnalyticsType;
}

export function ProductionAnalytics({ data }: Props) {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <OverviewStatCard
                    label="Total Assignments"
                    value={data.totalAssignments}
                    icon={Layers}
                />
                <OverviewStatCard
                    label="Completed"
                    value={data.completedAssignments}
                    icon={CheckCircle}
                />
                <OverviewStatCard
                    label="Pending"
                    value={data.pendingAssignments}
                    icon={Clock}
                />
                <OverviewStatCard
                    label="Items Produced"
                    value={data.totalItemsProduced}
                    icon={Package}
                />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Recent Assignments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.recentAssignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No recent assignments.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {data.recentAssignments.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex items-center justify-between py-2 text-sm"
                                >
                                    <span className="font-medium">
                                        {a.item}
                                    </span>
                                    <span className="text-muted-foreground">
                                        Qty: {a.qty}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {a.completedAt ?? "In progress"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
