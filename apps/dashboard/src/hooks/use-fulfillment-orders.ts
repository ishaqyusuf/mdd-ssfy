"use client";

import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTRPC } from "@/trpc/client";

/** Header counts and table pages share the same input and React Query cache. */
export function useFulfillmentOrdersOptions() {
	const trpc = useTRPC();
	const { filters } = useDispatchFilterParams();
	const { params } = useSortParams();
	return trpc.dispatch.fulfillmentOrders.infiniteQueryOptions(
		{
			q: filters.q,
			section: filters.section,
			stages: filters.stages,
			driversId: filters.driversId,
			dueBuckets: filters.dueBuckets,
			deliveryModes: filters.deliveryModes,
			risks: filters.risks,
			scheduleRange: filters.scheduleRange,
			sort: params.sort,
			size: 20,
		},
		{ getNextPageParam: (page) => page.meta.cursor, staleTime: 30_000 },
	);
}
