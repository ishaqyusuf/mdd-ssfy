"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useUnitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState({ embedded }: { embedded?: boolean }) {
	const { filters, setFilters } = useUnitInvoiceFilterParams();

	return (
		<CoreEmptyState
			title={embedded ? "No invoices" : "No unit invoices"}
			description="Unit invoice records will appear here after invoice tasks are created."
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
	const { filters, setFilters } = useUnitInvoiceFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
