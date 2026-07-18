"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No sales found"
			description="No sales found for the selected filters."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
