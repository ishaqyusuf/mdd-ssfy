"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState() {
	const { filters, setFilters } = useInventoryFilterParams();
	const { setParams } = useInventoryCategoryParams();

	return (
		<CoreEmptyState
			title="No categories"
			description="Inventory categories will appear here after they are created or imported."
			actionLabel="Create Category"
			onAction={() => {
				if (Object.values(filters).some((value) => value !== null)) {
					setFilters(clearFilters(filters));
					return;
				}

				setParams({
					editCategoryId: -1,
				});
			}}
		/>
	);
}

export function NoResults() {
	const { filters, setFilters } = useInventoryFilterParams();

	return (
		<CoreNoResults
			onClear={() => {
				setFilters(clearFilters(filters));
			}}
		/>
	);
}
