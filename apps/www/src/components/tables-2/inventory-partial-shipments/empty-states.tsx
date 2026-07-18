"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

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
