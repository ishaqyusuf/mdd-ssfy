"use client";

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@gnd/ui/chart";

const data = [
    { month: "Jan", sales: 4000, commission: 400 },
    { month: "Feb", sales: 3000, commission: 300 },
    { month: "Mar", sales: 5000, commission: 500 },
    { month: "Apr", sales: 2780, commission: 278 },
    { month: "May", sales: 1890, commission: 189 },
    { month: "Jun", sales: 2390, commission: 239 },
    { month: "Jul", sales: 3490, commission: 349 },
    { month: "Aug", sales: 4000, commission: 400 },
    { month: "Sep", sales: 5000, commission: 500 },
    { month: "Oct", sales: 6000, commission: 600 },
    { month: "Nov", sales: 7000, commission: 700 },
    { month: "Dec", sales: 9000, commission: 900 },
];

export default function SalesChart() {
    return (
        <ChartContainer
            config={{
                sales: {
                    label: "Sales ($)",
                    color: "hsl(var(--chart-1))",
                },
                commission: {
                    label: "Commission ($)",
                    color: "hsl(var(--chart-2))",
                },
            }}
            className="h-[300px]"
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="var(--color-sales)"
                        strokeWidth={2}
                    />
                    <Line
                        type="monotone"
                        dataKey="commission"
                        stroke="var(--color-commission)"
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}

