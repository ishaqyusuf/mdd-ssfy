"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No pending payment orders"
			description="There are no pending payment orders for this statement."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
