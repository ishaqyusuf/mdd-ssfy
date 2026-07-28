"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from "recharts";

type ChartPoint = {
    label: string;
    value: number;
};

export function WorkerPaymentsEarningsChart({ data }: { data: ChartPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar
                    dataKey="value"
                    radius={[10, 10, 0, 0]}
                    fill="hsl(var(--primary))"
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
