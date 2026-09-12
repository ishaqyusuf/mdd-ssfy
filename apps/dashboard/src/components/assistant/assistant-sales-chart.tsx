"use client";

import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@gnd/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { salesData } from "./assistant-preview-data";

export default function AssistantSalesChart() {
	return (
		<div>
			<ChartContainer
				config={{ sales: { label: "Sales", color: "#547568" } }}
				className="h-[210px] w-full"
			>
				<AreaChart
					accessibilityLayer
					data={salesData}
					margin={{ left: 0, right: 12, top: 16, bottom: 0 }}
				>
					<defs>
						<linearGradient
							id="assistant-sales-fill"
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop offset="0%" stopColor="#547568" stopOpacity={0.2} />
							<stop offset="100%" stopColor="#547568" stopOpacity={0.01} />
						</linearGradient>
					</defs>
					<CartesianGrid vertical={false} strokeDasharray="3 5" />
					<XAxis
						dataKey="week"
						tickLine={false}
						axisLine={false}
						tickMargin={12}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tickFormatter={(value) => `$${value / 1000}k`}
						width={48}
					/>
					<ChartTooltip content={<ChartTooltipContent />} />
					<Area
						type="monotone"
						dataKey="sales"
						stroke="#547568"
						strokeWidth={2}
						fill="url(#assistant-sales-fill)"
					/>
				</AreaChart>
			</ChartContainer>
			<details className="mt-4 text-xs text-muted-foreground">
				<summary className="cursor-pointer">View data table</summary>
				<table className="mt-3 w-full text-left">
					<caption className="sr-only">
						Illustrative weekly sales in USD
					</caption>
					<thead>
						<tr>
							<th>Week</th>
							<th>Sales (USD)</th>
						</tr>
					</thead>
					<tbody>
						{salesData.map((row) => (
							<tr key={row.week}>
								<td className="py-1">{row.week}</td>
								<td>${row.sales.toLocaleString("en-US")}</td>
							</tr>
						))}
					</tbody>
				</table>
			</details>
		</div>
	);
}
