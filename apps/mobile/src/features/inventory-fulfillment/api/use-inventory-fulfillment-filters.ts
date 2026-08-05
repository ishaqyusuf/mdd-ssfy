import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
	type InventoryFulfillmentFilters,
	countInventoryFulfillmentFilters,
	parseInventoryFulfillmentFilters,
	serializeInventoryFulfillmentFilters,
} from "../lib/inventory-fulfillment-filters";
import type { InventoryFulfillmentMode } from "../lib/inventory-fulfillment-model";

export function useInventoryFulfillmentFilters(mode: InventoryFulfillmentMode) {
	const params = useLocalSearchParams<Record<string, string | string[]>>();
	const router = useRouter();
	const filters = useMemo(
		() => parseInventoryFulfillmentFilters(params, mode),
		[mode, params],
	);
	const setFilters = useCallback(
		(next: InventoryFulfillmentFilters) => {
			router.setParams(serializeInventoryFulfillmentFilters(next));
		},
		[router],
	);

	return {
		filters,
		setFilters,
		activeFilterCount: countInventoryFulfillmentFilters(filters),
	};
}
