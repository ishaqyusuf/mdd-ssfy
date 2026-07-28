"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No inbound shipments found"
			description="Create an inbound from the receiving tray to start receiving stock."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
