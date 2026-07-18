"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No pending commissions"
			description="Commissions awaiting processing or payment will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
