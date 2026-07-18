"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No pending payments"
			description="No pending payments found for this customer."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
