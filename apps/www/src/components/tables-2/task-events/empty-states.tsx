"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

type EmptyStateProps = {
	onRefresh?: () => void;
};

type NoResultsProps = {
	onClear: () => void;
};

export function EmptyState({ onRefresh }: EmptyStateProps) {
	return (
		<CoreEmptyState
			title="No task events"
			description="No scheduled task events are configured yet."
			actionLabel="Refresh"
			onAction={onRefresh ?? (() => window.location.reload())}
		/>
	);
}

export function NoResults({ onClear }: NoResultsProps) {
	return (
		<CoreEmptyState
			title="No matching task events"
			description="Try a different event name, status, or description."
			actionLabel="Clear search"
			onAction={onClear}
		/>
	);
}
