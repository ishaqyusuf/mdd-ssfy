"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

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
