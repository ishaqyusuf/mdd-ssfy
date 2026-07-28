"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No payment rows"
			description="No sales payment rows are linked to this transaction yet."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
