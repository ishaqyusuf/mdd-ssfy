"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useProductReportFilters } from "@/hooks/use-product-report-filter-params";

export function EmptyState() {
	const { filters, setFilters } = useProductReportFilters();

	return (
		<CoreEmptyState
			title="No product report data"
			description="Products with sales activity will appear here after orders are recorded."
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
	const { filters, setFilters } = useProductReportFilters();

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
