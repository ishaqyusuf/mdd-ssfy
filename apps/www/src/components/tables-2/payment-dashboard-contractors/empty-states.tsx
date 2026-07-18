"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No payout queue"
			description="Contractors with pending review or ready-to-pay jobs will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
