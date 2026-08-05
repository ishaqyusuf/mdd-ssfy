"use client";

import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@gnd/api/trpc/routers/_app";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { useRouter } from "next/navigation";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type Trend = RouterOutputs["salesRepDashboard"]["trend"];

export function SalesRepPerformanceCard({ data }: { data: Trend }) {
	const router = useRouter();

	return (
		<Card className="min-w-0 overflow-hidden">
			<CardHeader className="pb-3">
				<CardTitle>Booked sales</CardTitle>
				<CardDescription>
					Order value across the selected period. Select a bar to see its
					orders.
				</CardDescription>
			</CardHeader>
			<CardContent className="min-w-0 px-2 pb-4 sm:px-6">
				{data.length ? (
					<div className="h-[250px] min-w-0 w-full sm:h-[310px]">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={data}
								margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
							>
								<CartesianGrid strokeDasharray="3 3" vertical={false} />
								<XAxis
									axisLine={false}
									dataKey="date"
									fontSize={10}
									minTickGap={28}
									tickLine={false}
								/>
								<YAxis
									axisLine={false}
									fontSize={10}
									tickFormatter={(value) =>
										Intl.NumberFormat("en", {
											notation: "compact",
										}).format(Number(value))
									}
									tickLine={false}
									width={54}
								/>
								<Tooltip
									cursor={{ fill: "var(--muted)", fillOpacity: 0.55 }}
									formatter={(value) => [
										formatCurrency.format(Number(value)),
										"Booked sales",
									]}
								/>
								<Bar
									className="cursor-pointer"
									dataKey="revenue"
									fill="var(--primary)"
									maxBarSize={44}
									onClick={(point) => {
										const row = point?.payload;
										if (!row?.rawDate) return;
										const query = new URLSearchParams({
											from: row.rawDate,
											to: row.bucketTo || row.rawDate,
										});
										router.push(`/sales-book/orders?${query.toString()}`);
									}}
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				) : (
					<div className="flex h-[250px] items-center justify-center px-6 text-center text-sm text-muted-foreground sm:h-[310px]">
						No booked sales in this period.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
