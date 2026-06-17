"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { useRouter } from "next/navigation";

export function EmptyState() {
	const router = useRouter();

	return (
		<CoreEmptyState
			title="No quotes"
			description="Create a quote to start an estimate for a customer."
			actionLabel="Create quote"
			onAction={() => router.push("/sales-book/create-quote")}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useOrderFilterParams();

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
