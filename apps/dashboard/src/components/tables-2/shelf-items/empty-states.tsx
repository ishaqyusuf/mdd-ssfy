"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No shelf products yet"
			description="Add shelf products so they are available in the sales-form shelf picker."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults({ onClear }: { onClear: () => void }) {
	return <CoreNoResults onClear={onClear} />;
}
