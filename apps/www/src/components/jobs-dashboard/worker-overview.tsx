"use client";

import { Icons } from "@gnd/ui/icons";

import { GuardedOpenJobSheet } from "@/components/guarded-open-job-sheet";
import { InsuranceWarningBanner } from "@/components/insurance-warning-banner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import {
	type InsuranceRequirement,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo } from "react";
import {
	Area,
	AreaChart,
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
			label: `Day ${values.length - list.length + index + 1}`,
			value,
		}));
	}, [earningAnalytics?.data]);

	const insuranceStatus = profile?.documents?.length
		? getInsuranceRequirement(profile.documents)
		: getFallbackInsuranceStatus();

	const summaryCards = [
		{
			icon: Icons.BriefcaseBusiness,
			label: "Completed Jobs",
			value: String(jobAnalytics?.completed || 0),
			accent:
				"border-sky-200 bg-[linear-gradient(135deg,rgba(224,242,254,0.95),rgba(255,255,255,1))] text-sky-900",
			iconClass: "bg-sky-500 text-white",
		},
		{
			icon: Icons.Clock3,
			label: "Pending Review",
			value: String(jobAnalytics?.inProgress || 0),
			accent:
				"border-amber-200 bg-[linear-gradient(135deg,rgba(254,243,199,0.92),rgba(255,255,255,1))] text-amber-950",
			iconClass: "bg-amber-500 text-white",
		},
		{
			icon: Icons.BadgeDollarSign,
			label: "Paid Jobs",
			value: String(jobAnalytics?.paid || 0),
			accent:
				"border-emerald-200 bg-[linear-gradient(135deg,rgba(220,252,231,0.95),rgba(255,255,255,1))] text-emerald-950",
			iconClass: "bg-emerald-500 text-white",
		},
	];

	return (
		<div className="grid gap-6">
			<section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(320px,1fr)]">
				<Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_58%,#0f766e_100%)] text-white shadow-xl shadow-slate-300/50">
					<CardContent className="relative p-0">
						<div className="absolute inset-0 overflow-hidden">
							<div className="absolute -left-16 top-6 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
							<div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl" />
							<div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
						</div>

						<div className="relative space-y-8 p-6 md:p-8">
							<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
								<div className="space-y-4">
									<div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">
										Today&apos;s Snapshot
									</div>
									<div className="space-y-3">
										<h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
											Keep jobs moving and payments predictable.
										</h2>
										<p className="max-w-xl text-sm leading-6 text-slate-200">
											{session?.user?.name || "Your dashboard"} gives you one
											clear place to submit jobs, stay document-ready, and keep
											an eye on what&apos;s waiting for review.
										</p>
									</div>
								</div>

								<div className="flex min-w-[220px] flex-col gap-3">
									<div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
										<p className="text-xs uppercase tracking-[0.22em] text-white/65">
											This Month
										</p>
										<p className="mt-2 text-3xl font-semibold text-white">
											{formatCurrency(earningAnalytics?.earning)}
										</p>
										<p className="mt-1 text-xs text-slate-200">
											Updated {formatDate(new Date())}
										</p>
									</div>
									<GuardedOpenJobSheet
										label="Submit Job"
										size="lg"
										className="w-full rounded-2xl border-0 bg-white text-slate-900 shadow-lg shadow-black/10 hover:bg-slate-100"
									/>
								</div>
							</div>

							<div className="grid gap-3 md:grid-cols-3">
								{summaryCards.map((card) => {
									const Icon = card.icon;
									return (
										<div
											key={card.label}
											className={`rounded-2xl border p-4 shadow-sm ${card.accent}`}
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="text-sm font-medium opacity-80">
														{card.label}
													</p>
													<p className="mt-3 text-3xl font-semibold tracking-tight">
														{card.value}
													</p>
												</div>
												<div
													className={`flex size-10 items-center justify-center rounded-2xl ${card.iconClass}`}
												>
													<Icon className="h-4 w-4" />
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</CardContent>
				</Card>

				<InsuranceWarningBanner
					status={insuranceStatus}
					showWhenValid
					className="h-full rounded-[28px] border-0 shadow-lg shadow-slate-200/60"
					ctaLabel={
						insuranceStatus.blocking ? "Open documents" : "Review document"
					}
				/>
			</section>

			<section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
				<Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-lg shadow-slate-200/60">
					<CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
						<div className="space-y-2">
							<div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
								<Icons.TrendingUp className="h-3.5 w-3.5" />
								Earnings Trend
							</div>
							<CardTitle className="text-xl font-semibold text-slate-900">
								Weekly earnings pulse
							</CardTitle>
							<p className="text-sm text-slate-500">
								Last 7 recorded days for this month
							</p>
						</div>
						<div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
							<p className="text-xs uppercase tracking-[0.18em] text-slate-500">
								vs last month
							</p>
							<p className="mt-1 text-2xl font-semibold text-slate-900">
								{earningAnalytics?.percentageVsLastMonth ?? 0}%
							</p>
						</div>
					</CardHeader>
					<CardContent className="h-80 pt-4">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartData}>
								<defs>
									<linearGradient
										id="worker-overview-earnings"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
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
									cursor={{ stroke: "#0ea5e9", strokeDasharray: "4 4" }}
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
					</CardContent>
				</Card>

				<div className="grid gap-4">
					<Card className="rounded-[28px] border border-slate-200/80 bg-white shadow-lg shadow-slate-200/60">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-lg text-slate-900">
								<Icons.ReceiptText className="h-5 w-5 text-sky-600" />
								Quick Actions
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-3">
							<QuickLink
								href="/jobs-dashboard/jobs-list"
								title="Open jobs list"
								description="Review submissions, statuses, and follow-ups."
								accent="bg-sky-50 text-sky-700"
							/>
							<QuickLink
								href="/jobs-dashboard/payments"
								title="View payments"
								description="Check paid jobs and earnings progress."
								accent="bg-emerald-50 text-emerald-700"
							/>
							<QuickLink
								href="/settings/profile?tab=documents"
								title="Manage documents"
								description="Upload or refresh your insurance document."
								accent="bg-amber-50 text-amber-700"
							/>
						</CardContent>
					</Card>

					<Card className="overflow-hidden rounded-[28px] border-0 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#eff6ff_100%)] shadow-lg shadow-orange-100/70">
						<CardContent className="space-y-4 p-6">
							<div className="flex items-center gap-3">
								<div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
									<Icons.ShieldCheck className="h-5 w-5" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900">
										Stay approval-ready
									</p>
									<p className="text-xs text-slate-500">
										Small habits that keep jobs moving
									</p>
								</div>
							</div>
							<div className="space-y-3 text-sm text-slate-600">
								<p>
									Clear job descriptions and a current insurance document reduce
									back-and-forth during review.
								</p>
								<Button
									asChild
									variant="outline"
									className="w-full rounded-2xl border-slate-200 bg-white hover:bg-slate-50"
								>
									<Link href="/settings/profile?tab=documents">
										Open documents
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}

function QuickLink({
	href,
	title,
	description,
	accent,
}: {
	href: string;
	title: string;
	description: string;
	accent: string;
}) {
	return (
		<Button
			asChild
			variant="ghost"
			className="h-auto rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"
		>
			<Link href={href}>
				<div className="flex w-full items-start justify-between gap-4">
					<div className="space-y-1">
						<p className="font-semibold text-slate-900">{title}</p>
						<p className="text-xs leading-5 text-slate-500">{description}</p>
					</div>
					<div
						className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${accent}`}
					>
						<Icons.ArrowRight className="h-4 w-4" />
					</div>
				</div>
			</Link>
		</Button>
	);
}
