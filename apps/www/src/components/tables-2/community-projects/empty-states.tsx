"use client";

import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { useModal } from "@/components/common/modal/provider";
import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const modal = useModal();
	const { filters, setFilters } = useCommunityProjectFilterParams();
	const hasFilters = Object.values(filters).some((value) => value !== null);

	return (
		<CoreEmptyState
			title="No community projects"
			description="Community projects will appear here after they are created."
			actionLabel={hasFilters ? "Clear filters" : "Create Project"}
			onAction={() => {
				if (hasFilters) {
					setFilters(clearFilters(filters));
					return;
				}

				modal.openModal(<ProjectModal />);
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useCommunityProjectFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
