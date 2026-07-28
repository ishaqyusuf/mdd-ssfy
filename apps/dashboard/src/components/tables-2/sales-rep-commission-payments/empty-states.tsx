"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No commission payments"
			description="Paid commission batches will appear here after payroll records a payment."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
