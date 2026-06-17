"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";

export function EmptyState() {
	const { filters, setFilters } = useSalesAccountingFilterParams();

	return (
		<CoreEmptyState
			title="No accounting records"
			description="Payments and accounting activity will appear here after sales transactions are recorded."
			actionLabel="Clear filters"
			onAction={() => {
				setFilters(
					Object.fromEntries(
						Object.keys(filters).map((key) => [key, null]),
					) as typeof filters,
				);
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useSalesAccountingFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(
					Object.fromEntries(
						Object.keys(filters).map((key) => [key, null]),
					) as typeof filters,
				);
			}}
		/>
	);
}
