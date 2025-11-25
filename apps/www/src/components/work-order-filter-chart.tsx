"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";

const generateChartData = (count: number) => {
  const data = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const month = date.toLocaleString("default", { month: "short" }).toUpperCase();
    const day = date.getDate();
    data.push({
      date: i === 0 ? "TODAY" : `${month} ${day}`,
      total: Math.floor(Math.random() * 20) + 5,
    });
  }
  return data;
};

const data = generateChartData(60);

export function WorkOrderFilterChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClick = (data: any, index: number) => {
    console.log(`Filtering by date: ${data.date}`);
    // Toggle selection
    if (index === activeIndex) {
      setActiveIndex(null);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <div className="h-[80px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
          barGap={1}
        >
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval={6} // Show label every 7 days
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--secondary))", radius: 2 }}
            content={({ active, payload, label }) =>
              active && payload && payload.length ? (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {label}
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {payload[0].value} Work Orders
                      </span>
                    </div>
                  </div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="total" radius={[2, 2, 0, 0]} onClick={handleClick}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                cursor="pointer"
                fill={
                  activeIndex === null || activeIndex === index
                    ? "hsl(var(--primary))"
                    : "hsl(var(--primary) / 0.3)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
