"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";

type NoResultsProps = {
	onClear: () => void;
};

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No task diagnostics"
			description="Task run diagnostics will appear here after monitored background work is started."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults({ onClear }: NoResultsProps) {
	return <CoreNoResults onClear={onClear} />;
}
