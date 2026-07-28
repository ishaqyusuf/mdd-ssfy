"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters } = useSalesProductionFilterParams();

	return (
		<CoreEmptyState
			title="No production work"
			description="Production orders will appear here when the active queue has matching work."
			actionLabel={
				Object.values(filters).some((value) => value !== null)
					? "Clear Filters"
					: undefined
			}
			onAction={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useSalesProductionFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
