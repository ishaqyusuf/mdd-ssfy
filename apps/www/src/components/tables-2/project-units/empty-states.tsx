"use client";

import { useHomeModal } from "@/app-deps/(v1)/(loggedIn)/community/units/home-modal";
import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState({ embedded }: { embedded?: boolean }) {
	const modal = useHomeModal();
	const { filters, setFilters } = useProjectUnitFilterParams();
	const hasFilters = Object.values(filters).some((value) => value !== null);

	return (
		<CoreEmptyState
			title={embedded ? "No units" : "No project units"}
			description={
				embedded
					? "Units for this project will appear here after they are created."
					: "Project units will appear here after they are created."
			}
			actionLabel={hasFilters ? "Clear filters" : "Create Unit"}
			onAction={() => {
				if (hasFilters) {
					setFilters(clearFilters(filters));
					return;
				}

				modal.open(null);
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useProjectUnitFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
