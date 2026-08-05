import { _trpc } from "@/components/static-trpc";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";
import type { InventoryFulfillmentFilters } from "../lib/inventory-fulfillment-filters";
import {
	type InventoryFulfillmentItem,
	adaptInventoryFulfillmentItem,
	isBackorderStatus,
} from "../lib/inventory-fulfillment-model";

export function useInventoryBackorderQueue(
	filters: InventoryFulfillmentFilters,
) {
	const deferredSearch = useDeferredValue(filters.q);
	const input = useMemo(
		() => ({
			q: deferredSearch || undefined,
			statuses: filters.statuses.filter(isBackorderStatus),
			deliveryModes: filters.deliveryModes,
			holdUntilComplete: filters.holdUntilComplete,
			limit: 30,
		}),
		[deferredSearch, filters],
	);
	const queue = useInfiniteQuery(
		_trpc.inventories.salesBackorderQueue.infiniteQueryOptions(input, {
			getNextPageParam: (page) => page.nextCursorId ?? undefined,
		}),
	);
	const summary = useQuery(
		_trpc.inventories.salesBackorderQueueSummary.queryOptions({
			q: input.q,
			statuses: input.statuses,
			deliveryModes: input.deliveryModes,
			holdUntilComplete: input.holdUntilComplete,
		}),
	);
	const items = useMemo(() => {
		const byId = new Map<string, InventoryFulfillmentItem>();
		for (const page of queue.data?.pages || []) {
			for (const item of page.items) {
				const model = adaptInventoryFulfillmentItem(item, "backorders");
				byId.set(model.key, model);
			}
		}
		return Array.from(byId.values());
	}, [queue.data]);

	return { ...queue, items, summary: summary.data, summaryQuery: summary };
}
