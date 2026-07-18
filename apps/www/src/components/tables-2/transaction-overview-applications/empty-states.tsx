"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No invoice application"
			description="No invoice application is linked to this transaction."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
