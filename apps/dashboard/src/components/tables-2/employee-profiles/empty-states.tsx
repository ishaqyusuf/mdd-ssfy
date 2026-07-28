"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No profiles"
			description="Create employee profiles to group commission and paycut settings."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
