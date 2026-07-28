"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No payable invoices"
			description="There are no invoice lines to display for this checkout."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
