"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No email transactions yet"
			description="Sales document emails will appear here after they are queued, sent, failed, or skipped."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults({ onClear }: { onClear: () => void }) {
	return <CoreNoResults onClear={onClear} />;
}
