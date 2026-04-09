"use client";

import { Icons } from "@gnd/ui/icons";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { SalesAnalytics as SalesAnalyticsType } from "../../types";
import { OverviewStatCard } from "../shared/overview-stat-card";

interface Props {
    data: SalesAnalyticsType;
}

export function SalesAnalytics({ data }: Props) {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <OverviewStatCard
                    label="Total Orders"
                    value={data.totalOrders}
                    icon={Icons.ShoppingCart}
                />
                <OverviewStatCard
                    label="Total Revenue"
                    value={data.totalRevenue}
                    icon={Icons.DollarSign}
                />
                <OverviewStatCard
                    label="Total Commission"
                    value={data.totalCommission}
                    icon={Icons.TrendingUp}
                />
                <OverviewStatCard
                    label="Pending Commission"
                    value={data.pendingCommission}
                    icon={Icons.Clock}
                />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        Recent Orders
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.recentOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No recent orders.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {data.recentOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between py-2 text-sm"
                                >
                                    <span className="font-medium">
                                        {order.salesNo}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {order.date}
                                    </span>
                                    <span className="font-medium">
                                        {order.total}
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
