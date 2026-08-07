"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { SalesFinanceAdoptionTracker } from "@/components/sales-finance/adoption";
import {
	SalesFinanceHeader,
	SalesFinanceTableSearch,
} from "@/components/sales-finance/header";
import { SalesFinanceInsightsSkeleton } from "@/components/sales-finance/insights-skeleton";
import { SalesFinanceReceivableSheet } from "@/components/sales-finance/receivable-sheet";
import { SalesFinanceReceivablesHeader } from "@/components/sales-finance/receivables-header";
import {
	SalesFinanceReceivablesSummary,
	SalesFinanceReceivablesSummarySkeleton,
} from "@/components/sales-finance/receivables-summary";
import { SalesFinanceResolutionHeader } from "@/components/sales-finance/resolution-header";
import {
	SalesFinanceSummary,
	SalesFinanceSummarySkeleton,
} from "@/components/sales-finance/summary";
import { SalesFinanceTransactionSheet } from "@/components/sales-finance/transaction-sheet";
import {
	SalesFinanceReceivablesDataTable,
	SalesFinanceReceivablesTableSkeleton,
} from "@/components/tables-2/sales-finance-receivables/data-table";
import {
	SalesFinanceDataTable,
	SalesFinanceTableSkeleton,
} from "@/components/tables-2/sales-finance/data-table";
import { DataTable as SalesFinanceResolutionDataTable } from "@/components/tables-2/sales-resolution/data-table";
import { SalesResolutionSkeleton as SalesFinanceResolutionTableSkeleton } from "@/components/tables-2/sales-resolution/skeleton";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import type { TableSettings } from "@/utils/table-settings";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

const SalesFinanceInsights = dynamic(
	() =>
		import("@/components/sales-finance/insights").then(
			(module) => module.SalesFinanceInsights,
		),
	{
		loading: () => <SalesFinanceInsightsSkeleton />,
		ssr: false,
	},
);

export function SalesFinanceWorkspaceClient({
	initialSettings,
	receivablesInitialSettings,
	resolutionInitialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
	receivablesInitialSettings?: Partial<TableSettings>;
	resolutionInitialSettings?: Partial<TableSettings>;
}) {
	const [mounted, setMounted] = useState(false);
	const { params } = useSalesFinanceFilterParams();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<>
				<SalesFinanceSummarySkeleton />
				<div className="space-y-3">
					<SalesFinanceHeader />
					<SalesFinanceInsightsSkeleton />
					<SalesFinanceTableSkeleton />
				</div>
			</>
		);
	}

	if (params.tab === "receivables") {
		return (
			<>
				<SalesFinanceAdoptionTracker surface="receivables" />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<SalesFinanceReceivablesSummarySkeleton />}>
						<SalesFinanceReceivablesSummary />
					</Suspense>
				</ErrorBoundary>
				<div className="space-y-3">
					<SalesFinanceReceivablesHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<SalesFinanceReceivablesTableSkeleton />}>
							<SalesFinanceReceivablesDataTable
								initialSettings={receivablesInitialSettings}
							/>
						</Suspense>
					</ErrorBoundary>
				</div>
				<SalesFinanceReceivableSheet />
			</>
		);
	}

	if (params.tab === "resolution") {
		return (
			<>
				<SalesFinanceAdoptionTracker surface="resolution" />
				<div className="space-y-3">
					<SalesFinanceResolutionHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<SalesFinanceResolutionTableSkeleton />}>
							<SalesFinanceResolutionDataTable
								financeMode
								initialSettings={resolutionInitialSettings}
							/>
						</Suspense>
					</ErrorBoundary>
				</div>
			</>
		);
	}

	return (
		<>
			<SalesFinanceAdoptionTracker
				surface={params.tab === "review" ? "review" : "payments"}
			/>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<SalesFinanceSummarySkeleton />}>
					<SalesFinanceSummary />
				</Suspense>
			</ErrorBoundary>
			<div className="space-y-3">
				<SalesFinanceHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<SalesFinanceInsights />
				</ErrorBoundary>
				{params.tab === "all" ? <SalesFinanceTableSearch /> : null}
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<SalesFinanceTableSkeleton />}>
						<SalesFinanceDataTable initialSettings={initialSettings} />
					</Suspense>
				</ErrorBoundary>
			</div>
			<SalesFinanceTransactionSheet />
		</>
	);
}
