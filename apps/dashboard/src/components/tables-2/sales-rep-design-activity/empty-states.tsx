"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No recent activity"
			description="Recent sales, quotes, and commission activity will appear here."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
