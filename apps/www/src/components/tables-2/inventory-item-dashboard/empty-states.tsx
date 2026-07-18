"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

type Props = {
	title: string;
	description: string;
};

export function EmptyState({ title, description }: Props) {
	return (
		<CoreEmptyState
			title={title}
			description={description}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
