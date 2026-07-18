"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

type ClearProps = {
	onClear: () => void;
};

export function EmptyState() {
	return (
		<CoreEmptyState
			title="No notification channels"
			description="No notification channels are available yet."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults({ onClear }: ClearProps) {
	return (
		<CoreEmptyState
			title="No channels found"
			description="Try a different search or clear the current search."
			actionLabel="Clear search"
			onAction={onClear}
		/>
	);
}

export function ErrorState({ error }: { error: unknown }) {
	const description =
		error instanceof Error
			? error.message
			: "Something went wrong while loading notification channels.";

	return (
		<CoreEmptyState
			title="Could not load notification channels"
			description={description}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
