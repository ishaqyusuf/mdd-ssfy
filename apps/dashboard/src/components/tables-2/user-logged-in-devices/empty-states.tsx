"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No logged-in devices"
			description="There are no logged-in devices to display."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
