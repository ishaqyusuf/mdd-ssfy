"use client";
import { BarChartProps } from "@/lib/chart";
import { formatCurrency } from "@/lib/utils";
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
interface Props {
    data: BarChartProps[];
}
export default function BarChartComponent({ data }: Props) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
                <XAxis
                    dataKey="name"
                    stroke="#8884d8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#8884d8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={CustomTooltip as any} />
                {/* <Legend /> */}
                <Bar dataKey="total" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip bg-white p-1 rounded">
                <p className="label">{`${label} : ${formatCurrency.format(
                    payload[0].value
                )}`}</p>
                {/* <p className="intro">{getIntroOfPage(label)}</p> */}
                {/* <p className="desc">Anything you want can be displayed here.</p> */}
            </div>
        );
    }

    return null;
};
