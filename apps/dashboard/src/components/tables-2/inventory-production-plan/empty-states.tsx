"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No production components found"
			description="Inventory-backed sale components will appear here once synced."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
