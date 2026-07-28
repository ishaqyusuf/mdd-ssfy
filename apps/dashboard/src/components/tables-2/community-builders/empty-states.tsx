"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useBuilderFilterParams } from "@/hooks/use-builder-filter-params";
import { useBuilderParams } from "@/hooks/use-builder-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters } = useBuilderFilterParams();
	const { setParams } = useBuilderParams();

	return (
		<CoreEmptyState
			title="No builders"
			description="Builders will appear here after they are created."
			actionLabel="Create Builder"
			onAction={() => {
				if (Object.values(filters).some((value) => value !== null)) {
					setFilters(clearFilters(filters));
					return;
				}

				setParams({
					openBuilderId: -1,
				});
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useBuilderFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
