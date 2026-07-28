"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useQueryStates } from "nuqs";
import { parseAsString } from "nuqs/server";

const dealerFilterParams = {
	search: parseAsString,
};

export function EmptyState({
	onCreateDealer,
}: {
	onCreateDealer: () => void;
}) {
	return (
		<CoreEmptyState
			title="No dealers"
			description="Add a dealer account to start managing dealership access and sales profiles."
			actionLabel="Add dealer"
			onAction={onCreateDealer}
		/>
	);
}

export function NoResults() {
	const [filters, setFilters] = useQueryStates(dealerFilterParams);

	return (
		<CoreNoResults
			onClear={() => {
				void setFilters(
					Object.fromEntries(
						Object.keys(filters).map((key) => [key, null]),
					) as typeof filters,
				);
			}}
		/>
	);
}
