"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No pending allocations"
			description="Stock allocation suggestions that require manual approval will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
