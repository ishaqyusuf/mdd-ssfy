"use client";

import {
	EmptyState as CoreEmptyState,
	NoResults as CoreNoResults,
} from "@/components/tables-2/core";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import type {
	InventoryForm,
	InventoryProductKind,
} from "@gnd/inventory/schema";

type Props = {
	defaultProductKind?: InventoryProductKind;
};

function clearFilters<T extends Record<string, unknown>>(filters: T) {
	return Object.fromEntries(
		Object.keys(filters).map((key) => [key, null]),
	) as T;
}

export function EmptyState({ defaultProductKind = "inventory" }: Props) {
	const { filters, setFilters } = useInventoryFilterParams();
	const { setParams } = useInventoryParams();
	const isComponent = defaultProductKind === "component";

	return (
		<CoreEmptyState
			title={isComponent ? "No components" : "No inventory items"}
			description={
				isComponent
					? "Components will appear here after they are created or imported."
					: "Inventory items will appear here after they are created or imported."
			}
			actionLabel={isComponent ? "Create Component" : "Create Inventory"}
			onAction={() => {
				if (Object.values(filters).some((value) => value !== null)) {
					setFilters(clearFilters(filters));
					return;
				}

				setParams({
					productId: -1,
					defaultValues: {
						product: {
							productKind: defaultProductKind,
						},
					} as Partial<InventoryForm> as InventoryForm,
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
