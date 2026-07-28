"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No customer sales"
			description="No customer sales data available."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
