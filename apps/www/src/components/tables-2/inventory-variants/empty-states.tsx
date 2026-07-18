"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No variants"
			description="No inventory variants match the current filters."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
