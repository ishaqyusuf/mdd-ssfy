"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No suppliers"
			description="Search for an existing supplier or create a new supplier."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
