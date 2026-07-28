"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No dispatch lines found"
			description="Inventory-backed lines ready for assign, pack, fulfill, or release actions will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
