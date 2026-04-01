"use client";

import { ContractorPayoutsHeader } from "@/components/contractor-payouts-header";
import { DataTable } from "@/components/tables/contractor-payouts/data-table";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { format } from "date-fns";
import {
	ArrowRight,
	BadgeCheck,
	CreditCard,
	ReceiptText,
	TrendingUp,
	Wallet,
} from "lucide-react";
import Link from "next/link";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function PaymentsHistoryView() {
	const trpc = useTRPC();
	const { data, isPending } = useQuery(
		trpc.jobs.paymentDashboard.queryOptions({}),
	);

	const recentPayments = data?.recentPayments || [];

	return (
		<div className="flex flex-col gap-6">
			<section className="relative overflow-hidden rounded-3xl border bg-card">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.18),transparent_32%)]" />
				<div className="relative flex flex-col gap-6 p-6 md:p-8">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-3xl">
							<Badge variant="secondary" className="mb-3">
								Financials
							</Badge>
							<h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
								Payments dashboard
							</h1>
							<p className="mt-2 text-sm text-muted-foreground md:text-base">
								Track processed contractor payouts, scan recent payment batches,
								and jump into the portal whenever finance is ready to build the
								next batch.
							</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Button asChild size="lg" variant="outline">
								<Link href="/contractors/jobs/payment-dashboard">
									<ReceiptText data-icon="inline-start" />
									Open payment dashboard
								</Link>
							</Button>
							<Button asChild size="lg">
								<Link href="/contractors/jobs/payment-portal">
									<CreditCard data-icon="inline-start" />
									Create new payout
								</Link>
							</Button>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							label="This month paid"
							value={formatCurrency(data?.summary.currentMonthAmount)}
							icon={Wallet}
							isPending={isPending}
						/>
						<MetricCard
							label="Batches this month"
							value={String(data?.summary.currentMonthPayments || 0)}
							icon={ReceiptText}
							isPending={isPending}
						/>
						<MetricCard
							label="Ready to pay jobs"
							value={String(data?.summary.readyToPayCount || 0)}
							icon={BadgeCheck}
							isPending={isPending}
						/>
						<MetricCard
							label="Pending bill"
							value={formatCurrency(data?.summary.pendingBill)}
							icon={TrendingUp}
							isPending={isPending}
						/>
					</div>
				</div>
			</section>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
				<Card className="rounded-3xl">
					<CardHeader className="gap-4 border-b bg-muted/20">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<CardTitle>Payout history</CardTitle>
								<CardDescription>
									Processed contractor payment batches with live search and
									detail drill-down.
								</CardDescription>
							</div>
							<div className="w-full max-w-md">
								<ContractorPayoutsHeader />
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<div className="p-4 md:p-6">
							<DataTable />
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-6">
					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle>Recent payments</CardTitle>
							<CardDescription>
								The latest payout batches saved in the system.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							{isPending ? (
								<>
									<Skeleton className="h-20 rounded-2xl" />
									<Skeleton className="h-20 rounded-2xl" />
									<Skeleton className="h-20 rounded-2xl" />
								</>
							) : !recentPayments.length ? (
								<p className="text-sm text-muted-foreground">
									No payouts have been recorded yet.
								</p>
							) : (
								recentPayments.map((payment) => (
									<Link
										key={payment.id}
										href={`/contractors/jobs/payments/${payment.id}`}
										className="rounded-2xl border bg-background/70 p-4 transition-colors hover:bg-muted/30"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate font-medium text-foreground">
													{payment.contractor}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													#{payment.id} • {payment.jobCount} job
													{payment.jobCount === 1 ? "" : "s"}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{payment.paymentMethod}
													{payment.checkNo ? ` • Check ${payment.checkNo}` : ""}
													{" • "}
													{format(new Date(payment.createdAt), "MMM d, yyyy")}
												</p>
											</div>
											<div className="shrink-0 text-right">
												<p className="font-semibold text-foreground">
													{formatCurrency(payment.amount)}
												</p>
												<p className="mt-2 inline-flex items-center text-xs font-medium text-primary">
													View details
													<ArrowRight className="ml-1 h-3.5 w-3.5" />
												</p>
											</div>
										</div>
									</Link>
								))
							)}
						</CardContent>
					</Card>

					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle>Quick actions</CardTitle>
							<CardDescription>
								Jump straight into the active payment workflows.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<QuickLink
								href="/contractors/jobs/payment-portal"
								title="Open payment portal"
								description="Build a payout batch from ready-to-pay jobs."
							/>
							<QuickLink
								href="/contractors/jobs/payment-dashboard"
								title="Open contractor dashboard"
								description="See pending review counts, insurance, and contractor totals."
							/>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function MetricCard({
	label,
	value,
	icon: Icon,
	isPending,
}: {
	label: string;
	value: string;
	icon: typeof Wallet;
	isPending?: boolean;
}) {
	return (
		<div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">{label}</p>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			{isPending ? (
				<Skeleton className="mt-3 h-8 w-28 rounded-md" />
			) : (
				<p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
			)}
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
		<Link
			href={href}
			className="rounded-2xl border bg-background/70 p-4 transition-colors hover:bg-muted/30"
		>
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="font-medium text-foreground">{title}</p>
					<p className="mt-1 text-sm text-muted-foreground">{description}</p>
				</div>
				<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
			</div>
		</Link>
	);
}
