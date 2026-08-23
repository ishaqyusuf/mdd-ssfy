"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useCallback } from "react";

export function useRefreshSalesInventoryQueries(salesOrderId: number) {
	const queryClient = useQueryClient();
	const trpc = useTRPC();

	return useCallback(
		async (options?: { includeInboundWorkspace?: boolean }) => {
			const refreshes = [
				queryClient.invalidateQueries({
					queryKey: trpc.inventories.salesInventoryOverview.queryKey({
						salesOrderId,
					}),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.inventories.orderInboundShipments.queryKey({
						salesOrderId,
					}),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.getSaleOverview.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.getOrders.infiniteQueryKey(),
					refetchType: "active",
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.getOrdersSummary.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.getSalesHandoffActions.pathKey(),
				}),
			];

			if (options?.includeInboundWorkspace) {
				refreshes.push(
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipments.queryKey({}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundDemandQueue.queryKey({}),
					}),
				);
			}

			await Promise.all(refreshes);
		},
		[queryClient, salesOrderId, trpc],
	);
}

export function useFulfillSalesInventoryNeeds(input: {
	salesOrderId: number;
	onProtectedNeeds: () => void;
}) {
	const trpc = useTRPC();
	const refreshSalesInventoryQueries = useRefreshSalesInventoryQueries(
		input.salesOrderId,
	);

	return useMutation(
		trpc.inventories.fulfillSalesInventoryNeedsManually.mutationOptions({
			onSuccess: async (data) => {
				await refreshSalesInventoryQueries();
				if (data.protectedComponentCount > 0) {
					input.onProtectedNeeds();
					toast({
						title: "Some needs still require inbound review",
						description: `${data.fulfilledComponentCount} need${
							data.fulfilledComponentCount === 1 ? "" : "s"
						} fulfilled. ${data.protectedComponentCount} linked or received need${
							data.protectedComponentCount === 1 ? "" : "s"
						} preserved.`,
						variant: "destructive",
					});
					return;
				}
				toast({
					title: "Inventory needs fulfilled",
					description: `${data.fulfilledComponentCount} need${
						data.fulfilledComponentCount === 1 ? "" : "s"
					} manually fulfilled. Physical stock quantities were not changed.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to fulfill inventory needs",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
}
