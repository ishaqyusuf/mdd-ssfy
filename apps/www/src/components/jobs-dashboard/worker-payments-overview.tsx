"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";
import {
	ArrowRight,
	BadgeDollarSign,
	CalendarClock,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
} from "recharts";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value || 0);
}

export function WorkerPaymentsOverview() {
	const trpc = useTRPC();
	const { data: jobAnalytics } = useQuery(
		trpc.jobs.getJobAnalytics.queryOptions({}),
	);
	const { data: earningAnalytics } = useQuery(
		trpc.jobs.earningAnalytics.queryOptions({}),
	);

	const chartData = useMemo(() => {
		const values = earningAnalytics?.data || [];

		return values.slice(-7).map((value, index, list) => ({
			label: `D${values.length - list.length + index + 1}`,
			value,
		}));
	}, [earningAnalytics?.data]);

	return (
		<div className="grid gap-6">
			<div className="grid gap-4 md:grid-cols-3">
				<PaymentCard
					icon={Wallet}
					label="This Month Earnings"
					value={formatCurrency(earningAnalytics?.earning)}
				/>
				<PaymentCard
					icon={BadgeDollarSign}
					label="Paid Jobs"
					value={String(jobAnalytics?.paid || 0)}
				/>
				<PaymentCard
					icon={CalendarClock}
					label="Awaiting Payment"
					value={String(jobAnalytics?.pendingPayments || 0)}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Earnings Trend</CardTitle>
					</CardHeader>
					<CardContent className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartData}>
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
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Next Steps</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3">
						<Button
							asChild
							variant="outline"
							className="h-auto justify-between px-4 py-3 text-left"
						>
							<Link href="/jobs-dashboard/jobs-list">
								<div>
									<p className="font-medium">Review submitted jobs</p>
									<p className="text-xs text-muted-foreground">
										Open your jobs list to check approval and payment status.
									</p>
								</div>
								<ArrowRight className="h-4 w-4 text-muted-foreground" />
							</Link>
						</Button>
						<p className="text-sm text-muted-foreground">
							This page tracks worker earnings and payment progress from your
							current job activity.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function PaymentCard({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Wallet;
	label: string;
	value: string;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{label}</CardTitle>
				<Icon className="h-4 w-4 text-primary" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-semibold tracking-tight">{value}</div>
			</CardContent>
		</Card>
	);
}
