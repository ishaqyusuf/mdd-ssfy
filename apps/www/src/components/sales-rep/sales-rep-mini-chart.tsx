"use client";

import type { ChartConfig } from "@gnd/ui/chart";
import { ChartContainer } from "@gnd/ui/chart";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

type SalesRepMiniChartTone = "positive" | "negative";

export function SalesRepMiniChart({
    values,
    tone,
}: {
    values: readonly number[];
    tone: SalesRepMiniChartTone;
}) {
    const chartData = values.map((value, index) => ({
        index: `${index + 1}`,
        value,
    }));

    const chartConfig = {
        value: {
            label: "Trend",
            color:
                tone === "negative" ? "var(--destructive)" : "var(--primary)",
        },
    } satisfies ChartConfig;

    return (
        <ChartContainer
            config={chartConfig}
            className="mt-5 aspect-auto h-12 w-full"
        >
            <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 2, right: 2, bottom: 0, left: 2 }}
            >
                <XAxis dataKey="index" hide />
                <YAxis hide />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((item, index) => (
                        <Cell
                            fill={
                                index === chartData.length - 1
                                    ? "var(--color-value)"
                                    : "var(--muted)"
                            }
                            key={`${item.index}-${item.value}`}
                            opacity={index === chartData.length - 1 ? 1 : 0.72}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}
