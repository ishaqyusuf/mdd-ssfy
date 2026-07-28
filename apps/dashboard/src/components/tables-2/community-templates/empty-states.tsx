"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useAuth } from "@/hooks/use-auth";
import { useCommunityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { isCommunityUnitRestrictedAccess } from "@gnd/utils/constants";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const auth = useAuth();
	const { filters, setFilters } = useCommunityTemplateFilterParams();
	const { setParams } = useCommunityTemplateParams();
	const hasFilters = Object.values(filters).some((value) => value !== null);
	const isCommunityUnit = isCommunityUnitRestrictedAccess(auth.can);

	return (
		<CoreEmptyState
			title="No community templates"
			description="Community templates will appear here after they are created."
			actionLabel={
				hasFilters || isCommunityUnit ? "Clear filters" : "Create Template"
			}
			onAction={() => {
				if (hasFilters || isCommunityUnit) {
					setFilters(clearFilters(filters));
					return;
				}

				setParams({
					createTemplate: true,
				});
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useCommunityTemplateFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
