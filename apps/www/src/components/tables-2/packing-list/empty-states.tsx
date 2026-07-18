"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";

import type { PackingListTab } from "./columns";

function copyForTab(tab: PackingListTab) {
	if (tab === "completed") {
		return {
			title: "No completed packing orders yet",
			description:
				"Orders signed from packing mode will appear here once they are completed.",
		};
	}

	if (tab === "cancelled") {
		return {
			title: "No cancelled packing orders yet",
			description:
				"Cancelled packing-list deliveries will appear here for admin review.",
		};
	}

	return {
		title: "No pickup orders in the packing list",
		description:
			"Orders sent to packing will appear here for warehouse signoff.",
	};
}

export function EmptyState({ tab }: { tab: PackingListTab }) {
	const copy = copyForTab(tab);

	return (
		<CoreEmptyState
			title={copy.title}
			description={copy.description}
			actionLabel="Refresh"
			onAction={() => window.location.reload()}
		/>
	);
}

export function NoResults({ onClear }: { onClear: () => void }) {
	return <CoreNoResults onClear={onClear} />;
}
