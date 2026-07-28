"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No stock audit rows found"
			description="Stock audit verification categories will appear here when the audit report is available."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
