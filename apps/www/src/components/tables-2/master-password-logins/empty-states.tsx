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
			title="No master password logins"
			description="Master password login audit records will appear here when a configured master password is used."
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults({ onClear }: NoResultsProps) {
	return <CoreNoResults onClear={onClear} />;
}
