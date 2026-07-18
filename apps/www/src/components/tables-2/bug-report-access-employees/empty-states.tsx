"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

type Props = {
	text: string;
};

export function EmptyState({ text }: Props) {
	return (
		<CoreEmptyState
			title="No employees"
			description={text}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
