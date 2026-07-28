"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No document approvals"
			description="No employee insurance documents are waiting for review."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
