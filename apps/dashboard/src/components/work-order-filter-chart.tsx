"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "react-responsive";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

function Chart({ data }: { data: { date: string; total: number }[] }) {
	return (
		<ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={80}>
			<BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
				<XAxis
					dataKey="date"
					tickLine={false}
					axisLine={false}
					fontSize={10}
					minTickGap={18}
				/>
				<Tooltip
					cursor={{ fill: "var(--primary)", fillOpacity: 0.08 }}
					content={({ active, payload, label }) =>
						active && payload?.length ? (
							<div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
								<p className="text-muted-foreground">{label}</p>
								<p className="font-semibold">
									{payload[0]?.value ?? 0} new work orders
								</p>
							</div>
						) : null
					}
				/>
				<Bar dataKey="total" fill="var(--primary)" radius={[2, 2, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}

export function WorkOrderFilterChart() {
	const trpc = useTRPC();
	const isCompact = useMediaQuery({ maxWidth: 767 });
	const { data, isPending } = useQuery(
		trpc.customerService.getChart.queryOptions(undefined, {
			staleTime: 5 * 60_000,
			refetchOnWindowFocus: false,
		}),
	);

	return (
		<section
			aria-label="New work orders over the last 60 days"
			className="h-20 w-full"
		>
			{isPending ? (
				<div className="h-20 animate-pulse rounded bg-muted/30" />
			) : (
				<Chart data={isCompact ? (data ?? []).slice(-14) : (data ?? [])} />
			)}
		</section>
	);
}
