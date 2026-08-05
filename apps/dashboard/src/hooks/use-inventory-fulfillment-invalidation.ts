"use client";

import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useCallback } from "react";

export function useInventoryFulfillmentInvalidation() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	return useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.salesBackorderQueue.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.salesBackorderQueueSummary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.salesBackorderQueuePrintSelection.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.salesPartialShipmentQueue.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.salesPartialShipmentQueueSummary.queryKey(),
			}),
		]);
	}, [queryClient, trpc]);
}
