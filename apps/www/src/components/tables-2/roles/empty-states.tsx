"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No roles"
			description="Create roles to group permissions for employees."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
