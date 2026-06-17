"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useRouter } from "next/navigation";

export function EmptyState() {
	const router = useRouter();

	return (
		<CoreEmptyState
			title="No dispatches"
			description="Dispatches appear here once sales orders are ready for fulfillment."
			actionLabel="Create order"
			onAction={() => router.push("/sales-book/create-order")}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useDispatchFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(
					Object.fromEntries(
						Object.keys(filters).map((key) => [key, null]),
					) as typeof filters,
				);
			}}
		/>
	);
}
