"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

export function EmptyState({ text }: { text: string }) {
	return (
		<CoreEmptyState
			title="No payable jobs"
			description={text}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
