"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No inventory items found"
			description="Inventory product-kind review rows will appear here when there are active inventory records."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
