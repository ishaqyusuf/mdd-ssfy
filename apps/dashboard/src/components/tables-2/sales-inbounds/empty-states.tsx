"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

type Props = {
	text?: string;
};

export function EmptyState({ text }: Props) {
	return (
		<CoreEmptyState
			title="No inbound shipments found"
			description={
				text || "Adjust the search or status filter to find inbounds."
			}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
