"use client";

import { DataTable as ContractorQueueTable } from "@/components/tables-2/payment-dashboard-contractors/data-table";
import { DataTable as RecentPaymentsTable } from "@/components/tables-2/payment-dashboard-recent-payments/data-table";
import { generatePayrollReport } from "@/lib/job-print";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";
import { useState } from "react";
import { formatPaymentAmount as money } from "./payment-format";

export function PaymentDashboard({
	contractorQueueInitialSettings,
	recentPaymentsInitialSettings,
}: {
	contractorQueueInitialSettings?: Partial<TableSettings>;
	recentPaymentsInitialSettings?: Partial<TableSettings>;
}) {
	const trpc = useTRPC();
	const { data, isPending, isError, refetch } = useQuery(
		trpc.jobs.paymentDashboard.queryOptions(
			{},
			{ refetchOnWindowFocus: false, staleTime: 60 * 1000 },
		),
	);
	const [reveal, setReveal] = useState(false);
	const contractors = data?.contractors || [];
	const recentPayments = data?.recentPayments || [];
	const approvedAmount = contractors.reduce(
		(total, contractor) => total + contractor.subTotal,
		0,
	);
	return (
		<div className="min-w-0 space-y-6 pb-8">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Contractor payments
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						What’s ready to pay and what needs your attention.
					</p>
				</div>
				<Button asChild variant="outline">
					<Link href="/contractors/jobs/payments">
						<Icons.ReceiptText className="size-4" />
						Payout history
					</Link>
				</Button>
			</header>
			{isError ? (
				<div
					role="alert"
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5"
				>
					<p className="text-sm">Payment information could not be loaded.</p>
					<Button variant="outline" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : (
				<div className="grid min-w-0 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
					<aside className="space-y-5">
						<section className="rounded-2xl bg-[#18283f] p-6 text-white">
							<p className="text-sm text-slate-300">Unpaid contractor work</p>
							{isPending ? (
								<Skeleton className="mt-3 h-10 w-44 bg-white/15" />
							) : (
								<p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
									{money(data?.summary.pendingBill)}
								</p>
							)}
							<p className="mt-2 text-xs text-slate-300">
								{data?.summary.pendingJobs || 0} jobs across{" "}
								{contractors.length} contractors
							</p>
							<dl className="my-7 space-y-4 border-y border-white/15 py-5 text-sm">
								<div className="flex justify-between gap-3">
									<dt className="text-slate-300">Approved work</dt>
									<dd className="font-medium tabular-nums">
										{money(approvedAmount)}
									</dd>
								</div>
								<div className="flex justify-between gap-3">
									<dt className="text-slate-300">Awaiting review</dt>
									<dd className="font-medium">
										{data?.summary.pendingReviewCount || 0} jobs
									</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-slate-300">Paid this month</dt>
									<dd>
										<button
											type="button"
											aria-pressed={reveal}
											onClick={() => setReveal(!reveal)}
											className="min-h-8 rounded px-1 text-sm font-medium underline decoration-white/30 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
										>
											{reveal
												? money(data?.summary.currentMonthAmount)
												: "Reveal amount"}
										</button>
									</dd>
								</div>
							</dl>
							<Button
								asChild
								className="w-full bg-white text-[#18283f] hover:bg-slate-100"
							>
								<Link href="/contractors/jobs/payment-portal">
									Prepare a payout <Icons.ArrowRight className="size-4" />
								</Link>
							</Button>
						</section>
						<div className="px-1">
							<p className="text-sm font-medium">Payroll report</p>
							<p className="mt-1 text-xs leading-5 text-muted-foreground">
								A full breakdown of unpaid work by contractor.
							</p>
							<Button
								variant="ghost"
								size="sm"
								className="mt-2 px-0"
								disabled={isPending || !contractors.length}
								onClick={() => generatePayrollReport()}
							>
								<Icons.Printer className="size-4" />
								Generate report
							</Button>
						</div>
					</aside>
					<div className="min-w-0">
						<ContractorQueueTable
							tasks
							data={contractors}
							initialSettings={contractorQueueInitialSettings}
							isLoading={isPending}
						/>
					</div>
				</div>
			)}
			<section className="min-w-0">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2 className="font-semibold">Recent payouts</h2>
					<Button asChild variant="ghost" size="sm">
						<Link href="/contractors/jobs/payments">
							View all <Icons.ArrowRight className="size-4" />
						</Link>
					</Button>
				</div>
				<RecentPaymentsTable
					records
					data={recentPayments}
					initialSettings={recentPaymentsInitialSettings}
					isLoading={isPending}
				/>
			</section>
		</div>
	);
}
