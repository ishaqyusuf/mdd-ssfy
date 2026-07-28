"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No suppliers"
			description="Add a door supplier to choose supplier-specific pricing."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
