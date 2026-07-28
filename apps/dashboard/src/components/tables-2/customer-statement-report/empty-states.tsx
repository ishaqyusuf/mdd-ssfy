"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

type Props = {
	description: string;
};

export function EmptyState({ description }: Props) {
	return (
		<CoreEmptyState
			title="No customer statements"
			description={description}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
