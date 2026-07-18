"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No transactions"
			description="Customer payment and wallet transactions will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
