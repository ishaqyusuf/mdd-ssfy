"use client";

import { ContractorAdjustmentSheet } from "@/components/contractor-accounting/adjustment-sheet";
import { ContractorAccountingAlertsSheet } from "@/components/contractor-accounting/alerts-sheet";
import { ContractorCloseReadiness } from "@/components/contractor-accounting/close-readiness";
import { ContractorAccountingProfileSheet } from "@/components/contractor-accounting/contractor-profile-sheet";
import { ContractorAccountingControlCenterSheet } from "@/components/contractor-accounting/control-center-sheet";
import { ContractorAccountingEntrySheet } from "@/components/contractor-accounting/entry-sheet";
import { ContractorAccountingHeader } from "@/components/contractor-accounting/header";
import { ContractorInsightsSkeleton } from "@/components/contractor-accounting/insights";
import { ContractorIssueSheet } from "@/components/contractor-accounting/issue-sheet";
import { ContractorIssuesWorkspace } from "@/components/contractor-accounting/issues";
import { ContractorPayablesWorkspace } from "@/components/contractor-accounting/payables";
import { ContractorPayoutRunsSheet } from "@/components/contractor-accounting/payout-runs-sheet";
import {
	ContractorAccountingSummary,
	ContractorAccountingSummarySkeleton,
} from "@/components/contractor-accounting/summary";
import { ErrorFallback } from "@/components/error-fallback";
import {
	ContractorAccountingDataTable,
	ContractorAccountingTableSkeleton,
} from "@/components/tables-2/contractor-accounting/data-table";
import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import type { TableSettings } from "@/utils/table-settings";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

const ContractorAccountingInsights = dynamic(
	() =>
		import("@/components/contractor-accounting/insights").then(
			(module) => module.ContractorAccountingInsights,
		),
	{
		loading: () => <ContractorInsightsSkeleton />,
		ssr: false,
	},
);

export function ContractorAccountingPage({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	const [mounted, setMounted] = useState(false);
	const { params } = useContractorAccountingFilterParams();
	useEffect(() => setMounted(true), []);

	if (!mounted) {
		return (
			<>
				<ContractorAccountingSummarySkeleton />
				<div className="space-y-3">
					<ContractorAccountingHeader />
					<ContractorAccountingTableSkeleton />
				</div>
			</>
		);
	}

	const sheets = (
		<>
			<ContractorAccountingEntrySheet />
			<ContractorAdjustmentSheet />
			<ContractorAccountingControlCenterSheet />
			<ContractorAccountingProfileSheet />
			<ContractorIssueSheet />
			<ContractorPayoutRunsSheet />
			<ContractorAccountingAlertsSheet />
		</>
	);

	if (params.tab === "payables") {
		return (
			<>
				<div className="space-y-3">
					<ContractorAccountingHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<ContractorAccountingTableSkeleton />}>
							<ContractorPayablesWorkspace />
						</Suspense>
					</ErrorBoundary>
				</div>
				{sheets}
			</>
		);
	}

	if (params.tab === "review" || params.tab === "resolution") {
		return (
			<>
				<div className="space-y-3">
					<ContractorAccountingHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<ContractorAccountingTableSkeleton />}>
							<ContractorIssuesWorkspace mode={params.tab} />
						</Suspense>
					</ErrorBoundary>
				</div>
				{sheets}
			</>
		);
	}

	return (
		<>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<ContractorAccountingSummarySkeleton />}>
					<ContractorAccountingSummary />
				</Suspense>
			</ErrorBoundary>
			<div className="space-y-3">
				<ContractorAccountingHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<ContractorAccountingInsights />
				</ErrorBoundary>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<ContractorCloseReadiness />
				</ErrorBoundary>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<ContractorAccountingTableSkeleton />}>
						<ContractorAccountingDataTable initialSettings={initialSettings} />
					</Suspense>
				</ErrorBoundary>
			</div>
			{sheets}
		</>
	);
}
