"use client";

import { EmptyState as CoreEmptyState } from "@/components/tables-2/core";

type Props = {
	isSuperAdmin?: boolean;
};

export function EmptyState({ isSuperAdmin }: Props) {
	return (
		<CoreEmptyState
			title="No bug reports"
			description={
				isSuperAdmin
					? "No bug reports match this view."
					: "You have not submitted a bug report yet."
			}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}
