"use client";

import { InsuranceWarningBanner } from "@/components/insurance-warning-banner";
import { OpenJobSheet } from "@/components/open-contractor-jobs-sheet";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";
import {
	type InsuranceRequirement,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import {
	ArrowRight,
	BadgeDollarSign,
	BriefcaseBusiness,
	Clock3,
	ShieldCheck,
} from "lucide-react";
import { useSession } from "next-auth/react";
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

function getFallbackInsuranceStatus(): InsuranceRequirement {
	return {
		blocking: true,
		expiresAt: null,
		message: "Upload your insurance document before submitting a new job.",
		state: "missing",
	};
}

export function WorkerOverview() {
	const trpc = useTRPC();
	const { data: session, status } = useSession();
	const enabled = status === "authenticated";
	const { data: profile } = useQuery(
		trpc.user.getProfile.queryOptions(undefined, {
			enabled,
		}),
	);
	const { data: jobAnalytics } = useQuery(
		trpc.jobs.getJobAnalytics.queryOptions(
			{},
			{
				enabled,
			},
		),
	);
	const { data: earningAnalytics } = useQuery(
		trpc.jobs.earningAnalytics.queryOptions(
			{},
			{
				enabled,
			},
		),
	);

	const chartData = useMemo(() => {
		const values = earningAnalytics?.data || [];

		return values.slice(-7).map((value, index, list) => ({
			label: `D${values.length - list.length + index + 1}`,
			value,
		}));
	}, [earningAnalytics?.data]);

	const insuranceStatus = profile?.documents?.length
		? getInsuranceRequirement(profile.documents)
		: getFallbackInsuranceStatus();

	return (
		<div className="grid gap-6">
			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
				<Card className="border-border/60 bg-gradient-to-br from-background via-background to-muted/30">
					<CardHeader className="gap-4">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="space-y-2">
								<p className="text-sm font-medium text-muted-foreground">
									Welcome back
								</p>
								<CardTitle className="text-3xl font-semibold tracking-tight">
									{session?.user?.name || "Worker dashboard"}
								</CardTitle>
								<p className="max-w-2xl text-sm text-muted-foreground">
									Track your submitted jobs, check earnings progress, and stay
									ahead of any document requirements.
								</p>
							</div>
							<OpenJobSheet label="Submit Job" size="lg" />
						</div>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-3">
						<MetricCard
							icon={BriefcaseBusiness}
							label="Completed Jobs"
							value={String(jobAnalytics?.completed || 0)}
						/>
						<MetricCard
							icon={Clock3}
							label="Pending Review"
							value={String(jobAnalytics?.inProgress || 0)}
						/>
						<MetricCard
							icon={BadgeDollarSign}
							label="Paid Jobs"
							value={String(jobAnalytics?.paid || 0)}
						/>
					</CardContent>
				</Card>

				<InsuranceWarningBanner
					status={insuranceStatus}
					showWhenValid
					className="h-full"
					ctaLabel={
						insuranceStatus.blocking ? "Upload insurance" : "Review document"
					}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
				<Card>
					<CardHeader className="flex flex-row items-start justify-between gap-4">
						<div>
							<CardTitle className="text-lg">Earnings Progress</CardTitle>
							<p className="text-sm text-muted-foreground">
								Last 7 recorded days for this month
							</p>
						</div>
						<div className="text-right">
							<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
								This Month
							</p>
							<p className="text-2xl font-semibold">
								{formatCurrency(earningAnalytics?.earning)}
							</p>
							<p className="text-xs text-muted-foreground">
								vs last month {earningAnalytics?.percentageVsLastMonth ?? 0}%
							</p>
						</div>
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

				<div className="grid gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Quick Links</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-3">
							<QuickLink
								href="/jobs-dashboard/jobs-list"
								title="Open jobs list"
								description="Review your submitted jobs and status updates."
							/>
							<QuickLink
								href="/jobs-dashboard/payments"
								title="View payments"
								description="Check earnings totals and payment-related progress."
							/>
							<QuickLink
								href="/settings/profile"
								title="Manage documents"
								description="Upload or refresh your insurance record."
							/>
						</CardContent>
					</Card>

					<Card className="border-primary/20 bg-primary/5">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<ShieldCheck className="h-4 w-4 text-primary" />
								Stay approval-ready
							</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-muted-foreground">
							Clear job descriptions and an up-to-date insurance document help
							keep reviews moving quickly.
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function MetricCard({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof BriefcaseBusiness;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-xl border border-border/60 bg-background/80 p-4">
			<div className="mb-3 flex items-center justify-between">
				<p className="text-sm text-muted-foreground">{label}</p>
				<Icon className="h-4 w-4 text-primary" />
			</div>
			<p className="text-2xl font-semibold tracking-tight">{value}</p>
		</div>
	);
}

function QuickLink({
	href,
	title,
	description,
}: {
	href: string;
	title: string;
	description: string;
}) {
	return (
		<Button
			asChild
			variant="outline"
			className="h-auto justify-between gap-4 px-4 py-3 text-left"
		>
			<Link href={href}>
				<div>
					<p className="font-medium">{title}</p>
					<p className="text-xs text-muted-foreground">{description}</p>
				</div>
				<ArrowRight className="h-4 w-4 text-muted-foreground" />
			</Link>
		</Button>
	);
}
