"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState({ embedded }: { embedded?: boolean }) {
	const { filters, setFilters } = useUnitProductionFilterParams();

	return (
		<CoreEmptyState
			title={embedded ? "No production tasks" : "No unit productions"}
			description="Production tasks will appear here after units have produceable work."
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
	const { filters, setFilters } = useUnitProductionFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
