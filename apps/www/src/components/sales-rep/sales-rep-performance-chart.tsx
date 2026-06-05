"use client";

import type { ChartConfig } from "@gnd/ui/chart";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@gnd/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export type SalesRepPerformanceChartDatum = {
    month: string;
    sales: number;
    quotes: number;
    active?: boolean;
};

const chartConfig = {
    sales: {
        label: "Orders",
        color: "var(--chart-1)",
    },
    quotes: {
        label: "Quotes",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig;

export function SalesRepPerformanceChart({
    data,
}: {
    data: readonly SalesRepPerformanceChartDatum[];
}) {
    const chartData = data.map((item) => ({ ...item }));

    return (
        <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
        >
            <BarChart
                accessibilityLayer
                barCategoryGap="26%"
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
            >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                    axisLine={false}
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                />
                <YAxis
                    axisLine={false}
                    tickFormatter={(value) => `$${value}k`}
                    tickLine={false}
                    tickMargin={8}
                    width={42}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            indicator="dot"
                            labelFormatter={(value) => `${value}, 2026`}
                        />
                    }
                    cursor={false}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                    dataKey="sales"
                    fill="var(--color-sales)"
                    radius={[6, 6, 0, 0]}
                />
                <Bar
                    dataKey="quotes"
                    fill="var(--color-quotes)"
                    radius={[6, 6, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    );
}
