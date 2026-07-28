"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters, hasFilters } = useResolutionCenterFilterParams();

	return (
		<CoreEmptyState
			title="No payment conflicts"
			description="Orders with mismatched payment state will appear here for review."
			actionLabel={hasFilters ? "Clear filters" : "Refresh"}
			onAction={() => {
				if (hasFilters) {
					setFilters(clearFilters(filters));
					return;
				}

				window.location.reload();
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useResolutionCenterFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
