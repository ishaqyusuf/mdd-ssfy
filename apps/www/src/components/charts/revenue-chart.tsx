"use client";

import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const ToolTipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="w-[240px] border shadow-sm bg-background p-2">
                <p className="font-bold">{label}</p>
                <p className="text-sm text-green-500">
                    Revenue: ${payload[0].value.toLocaleString()}
                </p>
            </div>
        );
    }

    return null;
};

export function RevenueChart() {
    const { params } = useSalesDashboardParams();
    const trpc = useTRPC();
    const { data, isLoading } = useQuery(
        trpc.salesDashboard.getRevenueOverTime.queryOptions({
            from: params.from,
            to: params.to,
        }),
    );

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value as number) / 1000}k`}
                />
                <Tooltip
                    content={<ToolTipContent />}
                    cursor={{ fill: "transparent" }}
                />
                <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

