"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useShortLinksFilterParams } from "@/hooks/use-short-links-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters, hasFilters } = useShortLinksFilterParams();

	return (
		<CoreEmptyState
			title="No short links"
			description="Create compact links for SMS, email, and customer-facing workflows."
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
	const { filters, setFilters } = useShortLinksFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
