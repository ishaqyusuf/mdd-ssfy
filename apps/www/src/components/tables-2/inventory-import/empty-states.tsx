"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";

type EmptyStateProps = {
	onShowAllScopes: () => void;
};

type NoResultsProps = {
	onClear: () => void;
};

export function EmptyState({ onShowAllScopes }: EmptyStateProps) {
	return (
		<CoreEmptyState
			title="No import steps"
			description="Inventory import steps will appear here when a Dyke scope is available."
			actionLabel="Show All Scopes"
			onAction={onShowAllScopes}
		/>
	);
}

export function NoResults({ onClear }: NoResultsProps) {
	return <CoreNoResults onClear={onClear} />;
}
