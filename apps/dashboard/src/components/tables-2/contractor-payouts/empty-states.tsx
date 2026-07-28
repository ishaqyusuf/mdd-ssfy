"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useContractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters, hasFilters } = useContractorPayoutFilterParams();

	return (
		<CoreEmptyState
			title="No payouts"
			description="Processed contractor payout batches will appear here after finance creates payments."
			actionLabel={hasFilters ? "Clear filters" : "Open payment portal"}
			onAction={() => {
				if (hasFilters) {
					setFilters(clearFilters(filters));
					return;
				}

				window.location.href = "/contractors/jobs/payment-portal";
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useContractorPayoutFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
