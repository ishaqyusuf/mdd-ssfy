"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { ChartContainer, ChartTooltipContent } from "@gnd/ui/chart";

interface DispatchProgressData {
    dispatchedQty?: number;
    pendingDispatchQty?: number;
    pendingProductionQty?: number;
    availableDispatchQty?: number;
}

interface DispatchProgressChartProps {
    data: DispatchProgressData;
}

export function DispatchProgressChart({ data }: DispatchProgressChartProps) {
    const chartData = [
        {
            name: "Dispatch Progress",
            dispatched: data.dispatchedQty,
            pending: data.pendingDispatchQty,
            production: data.pendingProductionQty,
            available: data.availableDispatchQty,
        },
    ];

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>Dispatch Progress</CardTitle>
                <CardDescription>
                    Overview of dispatch quantities
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            Dispatched
                        </p>
                        <p className="text-2xl font-bold">
                            {data.dispatchedQty}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            Pending Dispatch
                        </p>
                        <p className="text-2xl font-bold">
                            {data.pendingDispatchQty}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            Pending Production
                        </p>
                        <p className="text-2xl font-bold">
                            {data.pendingProductionQty}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            Available
                        </p>
                        <p className="text-2xl font-bold">
                            {data.availableDispatchQty}
                        </p>
                    </div>
                </div>

                <ChartContainer
                    config={{
                        dispatched: {
                            label: "Dispatched",
                            color: "hsl(var(--chart-1))",
                        },
                        pending: {
                            label: "Pending Dispatch",
                            color: "hsl(var(--chart-2))",
                        },
                        production: {
                            label: "Pending Production",
                            color: "hsl(var(--chart-3))",
                        },
                        available: {
                            label: "Available",
                            color: "hsl(var(--chart-4))",
                        },
                    }}
                    className="h-[100px] w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                            />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" hide />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar
                                dataKey="dispatched"
                                stackId="a"
                                fill="var(--color-dispatched)"
                                name="Dispatched"
                            />
                            <Bar
                                dataKey="pending"
                                stackId="a"
                                fill="var(--color-pending)"
                                name="Pending Dispatch"
                            />
                            <Bar
                                dataKey="production"
                                stackId="a"
                                fill="var(--color-production)"
                                name="Pending Production"
                            />
                            <Bar
                                dataKey="available"
                                stackId="a"
                                fill="var(--color-available)"
                                name="Available"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
