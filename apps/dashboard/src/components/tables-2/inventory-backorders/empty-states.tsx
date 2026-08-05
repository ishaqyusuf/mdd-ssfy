"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";
import { useInventoryBackorderFilterParams } from "@/hooks/use-inventory-backorder-filter-params";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No backorders found"
			description="Open shortages and partial shipment lines will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults() {
	const { setFilters } = useInventoryBackorderFilterParams();
	return (
		<CoreEmptyState
			title="No matching backorders"
			description="Try another search or clear the active filters."
			actionLabel="Clear filters"
			onAction={() => void setFilters(null)}
		/>
	);
}
