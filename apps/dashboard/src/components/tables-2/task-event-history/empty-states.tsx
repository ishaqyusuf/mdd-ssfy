"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No history"
			description="This task event has not recorded any runs yet."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
