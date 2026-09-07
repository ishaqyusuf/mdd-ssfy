"use client";

import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useCallback } from "react";
import { cancelSupersededSalesOrdersRequests } from "./sales-orders-request-control";

export function useCancelSalesOrdersRequests() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	return useCallback(() => {
		void cancelSupersededSalesOrdersRequests({
			cancelQueries: (options) => queryClient.cancelQueries(options),
			listQueryKey: trpc.sales.getOrders.pathKey(),
			summaryQueryKey: trpc.sales.getOrdersSummary.pathKey(),
		});
	}, [queryClient, trpc]);
}
