"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";
import { useInventoryPartialShipmentFilterParams } from "@/hooks/use-inventory-partial-shipment-filter-params";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No partial shipments found"
			description="Inventory-backed lines with available, held, or blocked remaining quantity will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults() {
	const { setFilters } = useInventoryPartialShipmentFilterParams();
	return (
		<CoreEmptyState
			title="No matching partial shipments"
			description="Try another search or clear the active filters."
			actionLabel="Clear filters"
			onAction={() => void setFilters(null)}
		/>
	);
}
