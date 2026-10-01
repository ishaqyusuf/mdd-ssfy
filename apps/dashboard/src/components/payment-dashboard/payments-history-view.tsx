"use client";

import { ContractorPayoutsHeader } from "@/components/contractor-payouts-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/contractor-payouts/data-table";
import { ContractorPayoutsSkeleton } from "@/components/tables-2/contractor-payouts/skeleton";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { PageFilterData } from "@api/type";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Link from "next/link";
import { Suspense } from "react";
import { formatPaymentAmount as money } from "./payment-format";

export function PaymentsHistoryView({
	initialSettings,
	initialFilterList,
}: {
	initialSettings?: Partial<TableSettings>;
	initialFilterList?: PageFilterData[];
}) {
	const trpc = useTRPC();
	const enabled = useIdleQueryEnabled();
	const { data, isPending, isError } = useQuery(
		trpc.jobs.paymentDashboard.queryOptions(
			{},
			{ enabled, refetchOnWindowFocus: false },
		),
	);
	return (
		<div className="min-w-0 space-y-6 pb-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Payout history
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Recorded contractor payments and their included jobs.
					</p>
				</div>
				<Button asChild>
					<Link href="/contractors/jobs/payment-portal">
						Prepare a payout <Icons.ArrowRight className="size-4" />
					</Link>
				</Button>
			</header>
			<div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
				<section className="min-w-0 space-y-4">
					<ContractorPayoutsHeader initialFilterList={initialFilterList} />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<ContractorPayoutsSkeleton
									records
									initialSettings={initialSettings}
								/>
							}
						>
							<DataTable records initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</section>
				<aside className="space-y-4 rounded-xl border bg-card p-5">
					<h2 className="text-sm font-semibold">This month</h2>
					{isPending ? (
						<Skeleton className="h-9 w-36" />
					) : isError ? (
						<p className="text-sm text-muted-foreground">Summary unavailable</p>
					) : (
						<>
							<p className="text-3xl font-semibold tracking-tight tabular-nums">
								{money(data?.summary.currentMonthAmount)}
							</p>
							<p className="text-xs text-muted-foreground">
								{data?.summary.currentMonthPayments || 0} recorded payouts
							</p>
						</>
					)}
					<div className="border-t pt-4 text-xs leading-5 text-muted-foreground">
						Monthly totals exclude cancelled payouts and do not change with
						history filters.
					</div>
					<Button asChild variant="outline" className="w-full">
						<Link href="/contractors/jobs/payment-dashboard">
							Payment dashboard
						</Link>
					</Button>
				</aside>
			</div>
		</div>
	);
}
