"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useRouter } from "next/navigation";

export function EmptyState() {
	const router = useRouter();
	const { filters } = useDispatchFilterParams();
	const copy =
		filters.section === "active"
			? {
					title: "No active dispatches",
					description:
						"Assigned dispatches appear here until fulfillment is complete.",
				}
			: filters.section === "due-today"
				? {
						title: "No dispatches due today",
						description: "Active dispatches scheduled for today appear here.",
					}
				: filters.section === "past-due"
					? {
							title: "No past-due dispatches",
							description:
								"Active dispatches past their scheduled date appear here.",
						}
					: filters.section === "completed"
						? {
								title: "No completed dispatches",
								description: "Fulfilled dispatches appear here for reference.",
							}
						: {
								title: "No dispatches",
								description:
									"Dispatches appear here once sales orders are ready for fulfillment.",
							};

	return (
		<CoreEmptyState
			title={copy.title}
			description={copy.description}
			actionLabel="Create order"
			onAction={() => router.push("/sales-form/create-order")}
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
						Object.keys(filters).map((key) => [
							key,
							key === "section" ? filters.section : null,
						]),
					) as typeof filters,
				);
			}}
		/>
	);
}
