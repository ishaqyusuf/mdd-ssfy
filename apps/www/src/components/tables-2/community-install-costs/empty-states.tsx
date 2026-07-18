"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No install costs"
			description="Add install cost rates to reuse across community models and jobs."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
