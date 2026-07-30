"use client";

import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
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

export function SalesBookedTrendCard({ className }: { className?: string }) {
	const trpc = useTRPC();
	const router = useRouter();
	const { params } = useSalesDashboardParams();
	const trend = useQuery(
		trpc.salesDashboard.getRevenueOverTime.queryOptions({
			from: params.from,
			to: params.to,
		}),
	);

	return (
		<Card className={`min-w-0 overflow-hidden ${className || ""}`}>
			<CardHeader>
				<CardTitle>Booked sales trend</CardTitle>
				<CardDescription>
					Order value by {trend.data?.[0]?.granularity || "reporting"} bucket.
					Select a bar to open the matching orders.
				</CardDescription>
			</CardHeader>
			<CardContent className="min-w-0 overflow-hidden">
				{trend.isLoading ? (
					<Skeleton className="h-[320px] w-full" />
				) : trend.data?.length ? (
					<div className="h-[320px] min-w-0 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={trend.data} margin={{ left: 4, right: 4 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} />
								<XAxis
									dataKey="date"
									fontSize={11}
									tickLine={false}
									axisLine={false}
									minTickGap={24}
								/>
								<YAxis
									fontSize={11}
									tickLine={false}
									axisLine={false}
									width={58}
									tickFormatter={(value) =>
										Intl.NumberFormat("en", {
											notation: "compact",
										}).format(Number(value))
									}
								/>
								<Tooltip
									cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
									formatter={(value, name) => [
										name === "revenue"
											? formatCurrency.format(Number(value))
											: Number(value).toLocaleString(),
										name === "revenue" ? "Booked sales" : "Orders",
									]}
								/>
								<Bar
									dataKey="revenue"
									fill="hsl(var(--primary))"
									radius={[4, 4, 0, 0]}
									className="cursor-pointer"
									onClick={(point) => {
										const row = point?.payload;
										if (!row?.rawDate) return;
										const query = new URLSearchParams({
											from: row.rawDate,
											to: row.bucketTo || row.rawDate,
										});
										router.push(`/sales-book/orders?${query.toString()}`);
									}}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				) : (
					<div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
						No booked sales in this period.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
