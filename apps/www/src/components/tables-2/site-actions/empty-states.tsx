"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useSiteActionFilterParams } from "@/hooks/use-site-action-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filter, setFilter, hasFilters } = useSiteActionFilterParams();

	return (
		<CoreEmptyState
			title="No site actions"
			description="System activity will appear here after tracked actions are created."
			actionLabel={hasFilters ? "Clear filters" : "Refresh"}
			onAction={() => {
				if (hasFilters) {
					setFilter(clearFilters(filter));
					return;
				}

				window.location.reload();
			}}
		/>
	);
}

export function NoResults() {
	const { filter, setFilter } = useSiteActionFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilter(clearFilters(filter));
			}}
		/>
	);
}
