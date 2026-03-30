"use client";

import { cn } from "@/lib/utils";
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
	ShieldCheck,
	Wallet,
} from "lucide-react";
import Link from "next/link";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function getInsuranceTone(state?: string | null) {
	switch (state) {
		case "valid":
			return "default" as const;
		case "expiring_soon":
			return "secondary" as const;
		default:
			return "destructive" as const;
	}
}

export function PaymentDashboard() {
	const trpc = useTRPC();
	const { data, isPending } = useQuery(
		trpc.jobs.paymentDashboard.queryOptions({}),
	);

	const contractors = data?.contractors || [];
	const recentPayments = data?.recentPayments || [];

	return (
		<div className="flex flex-col gap-6 pb-8">
			<section className="relative overflow-hidden rounded-3xl border bg-card">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.15),transparent_34%)]" />
				<div className="relative flex flex-col gap-6 p-6 md:p-8">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-2xl">
							<Badge variant="secondary" className="mb-3">
								Contractor payments
							</Badge>
							<h1 className="text-3xl font-semibold tracking-tight text-foreground">
								Payment dashboard
							</h1>
							<p className="mt-2 text-sm text-muted-foreground md:text-base">
								Monitor unpaid contractor work, spot insurance blockers, and
								jump into the pay portal when finance is ready to batch jobs.
							</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Button asChild size="lg" variant="outline" className="min-w-[180px]">
								<Link href="/contractors/jobs/payments">
									<ReceiptText data-icon="inline-start" />
									View payouts
								</Link>
							</Button>
							<Button asChild size="lg" className="min-w-[220px]">
								<Link href="/contractors/jobs/payment-portal">
									<CreditCard data-icon="inline-start" />
									Open payment portal
								</Link>
							</Button>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							icon={Wallet}
							label="Pending bill"
							value={formatCurrency(data?.summary.pendingBill)}
							isPending={isPending}
						/>
						<MetricCard
							icon={BadgeCheck}
							label="Ready to pay"
							value={String(data?.summary.readyToPayCount || 0)}
							isPending={isPending}
						/>
						<MetricCard
							icon={ReceiptText}
							label="Pending review"
							value={String(data?.summary.pendingReviewCount || 0)}
							isPending={isPending}
						/>
						<MetricCard
							icon={CreditCard}
							label="This month payouts"
							value={formatCurrency(data?.summary.currentMonthAmount)}
							isPending={isPending}
							maskUntilHover
						/>
					</div>
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
				<Card>
					<CardHeader>
						<CardTitle>Ready for payout</CardTitle>
						<CardDescription>
							All contractors with pending review or ready-to-pay work.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						{isPending ? (
							<>
								<Skeleton className="h-20 rounded-2xl" />
								<Skeleton className="h-20 rounded-2xl" />
								<Skeleton className="h-20 rounded-2xl" />
							</>
						) : !contractors.length ? (
							<p className="text-sm text-muted-foreground">
								No contractor activity is waiting right now.
							</p>
						) : (
							contractors.map((contractor) => (
								<div
									key={contractor.id}
									className="flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
								>
									<div className="space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<p className="font-medium text-foreground">
												{contractor.name}
											</p>
											<Badge
												variant={getInsuranceTone(contractor.insurance.state)}
											>
												{contractor.insurance.state.replace("_", " ")}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											{contractor.email || "No email on file"}
										</p>
										<p className="text-xs text-muted-foreground">
											{contractor.lastProjectTitle
												? `Recent project: ${contractor.lastProjectTitle}`
												: contractor.insurance.message}
										</p>
										<div className="flex flex-wrap gap-2 pt-1">
											<Badge variant="secondary">
												{contractor.pendingReviewCount} pending review
											</Badge>
											<Badge variant="secondary">
												{contractor.readyToPayCount} ready to pay
											</Badge>
										</div>
									</div>
									<div className="flex flex-col gap-3 md:items-end">
										<div className="text-right">
											<p className="text-sm text-muted-foreground">Total pay</p>
											<p className="text-xl font-semibold text-foreground">
												{formatCurrency(contractor.totalPay)}
											</p>
										</div>
										<Button asChild variant="outline" size="sm">
											<Link
												href={`/contractors/jobs/payment-portal?contractorId=${contractor.id}`}
											>
												Open portal
												<ArrowRight data-icon="inline-end" />
											</Link>
										</Button>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<div className="grid gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Finance checklist</CardTitle>
							<CardDescription>
								The clean path for every contractor payout batch.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<ChecklistItem
								icon={ShieldCheck}
								title="Check insurance"
								description="See missing, pending, expired, and approved insurance before you pay."
							/>
							<ChecklistItem
								icon={ReceiptText}
								title="Review jobs"
								description="Mark only the jobs you want in the batch and open overview before paying."
							/>
							<ChecklistItem
								icon={CreditCard}
								title="Finalize payout"
								description="Apply adjustment or discount, choose payment method, add check number, and save."
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Recent payments</CardTitle>
							<CardDescription>
								The latest contractor payout batches recorded in the system.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							{isPending ? (
								<>
									<Skeleton className="h-16 rounded-2xl" />
									<Skeleton className="h-16 rounded-2xl" />
									<Skeleton className="h-16 rounded-2xl" />
								</>
							) : !recentPayments.length ? (
								<p className="text-sm text-muted-foreground">
									No payments have been recorded yet.
								</p>
							) : (
								recentPayments.map((payment) => (
									<Link
										key={payment.id}
										href={`/contractors/jobs/payments?openContractorPayoutId=${payment.id}`}
										className="flex items-start justify-between gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/30"
									>
										<div className="min-w-0 space-y-1">
											<p className="truncate font-medium text-foreground">
												{payment.contractor}
											</p>
											<p className="text-sm text-muted-foreground">
												#{payment.id} • {payment.jobCount} job
												{payment.jobCount === 1 ? "" : "s"} •{" "}
												{payment.paymentMethod}
												{payment.checkNo ? ` • Check ${payment.checkNo}` : ""}
											</p>
											<p className="text-xs text-muted-foreground">
												{payment.createdAt
													? `Sent ${format(new Date(payment.createdAt), "MMM d, yyyy")}`
													: "Date unavailable"}{" "}
												• Paid by {payment.paidBy}
											</p>
										</div>
										<p className="shrink-0 text-base font-semibold text-foreground">
											{formatCurrency(payment.amount)}
										</p>
									</Link>
								))
							)}
							<Button asChild variant="outline" className="w-full" size="lg">
								<Link href="/contractors/jobs/payments">
									<ReceiptText data-icon="inline-start" />
									View all payouts
								</Link>
							</Button>
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
	isPending,
	maskUntilHover = false,
}: {
	icon: typeof Wallet;
	label: string;
	value: string;
	isPending?: boolean;
	maskUntilHover?: boolean;
}) {
	return (
		<div className="group rounded-2xl border bg-background/85 p-4 shadow-sm backdrop-blur">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">{label}</p>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			{isPending ? (
				<Skeleton className="mt-3 h-8 w-28 rounded-md" />
			) : (
				<div className="relative mt-3">
					<p
						className={cn(
							"text-xl font-semibold text-foreground transition duration-200",
							maskUntilHover && "select-none blur-sm group-hover:blur-0",
						)}
					>
						{value}
					</p>
					{maskUntilHover ? (
						<p className="pointer-events-none absolute inset-0 flex items-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition group-hover:opacity-0">
							Hover to reveal
						</p>
					) : null}
				</div>
			)}
		</div>
	);
}

function ChecklistItem({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof ShieldCheck;
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-2xl border p-4">
			<div className="flex items-start gap-3">
				<div className="rounded-full bg-primary/10 p-2 text-primary">
					<Icon className="h-4 w-4" />
				</div>
				<div className="space-y-1">
					<p className="font-medium text-foreground">{title}</p>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
			</div>
		</div>
	);
}
