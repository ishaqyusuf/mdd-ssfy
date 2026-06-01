"use client";

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from "recharts";

type ChartPoint = {
    label: string;
    value: number;
};

export function WorkerOverviewEarningsChart({ data }: { data: ChartPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient
                        id="worker-overview-earnings"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="#0ea5e9"
                            stopOpacity={0.35}
                        />
                        <stop
                            offset="100%"
                            stopColor="#0ea5e9"
                            stopOpacity={0.03}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    vertical={false}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                    cursor={{
                        stroke: "#0ea5e9",
                        strokeDasharray: "4 4",
                    }}
                    contentStyle={{
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0f172a"
                    strokeWidth={3}
                    fill="url(#worker-overview-earnings)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
