"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";

export function EmptyState() {
	const { filter, setFilter } = useInboundFilterParams();

	return (
		<CoreEmptyState
			title="No inbound orders"
			description="Inbound orders will appear here after inbound status is recorded on a sales order."
			actionLabel="Clear filters"
			onAction={() => {
				setFilter(
					Object.fromEntries(
						Object.keys(filter).map((key) => [key, null]),
					) as typeof filter,
				);
			}}
		/>
	);
}

export function NoResults() {
	const { filter, setFilter } = useInboundFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilter(
					Object.fromEntries(
						Object.keys(filter).map((key) => [key, null]),
					) as typeof filter,
				);
			}}
		/>
	);
}
