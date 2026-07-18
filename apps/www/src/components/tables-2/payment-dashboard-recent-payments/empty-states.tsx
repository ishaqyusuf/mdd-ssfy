"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No recent payouts"
			description="The latest contractor payout batches will appear here after finance records a payment."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
