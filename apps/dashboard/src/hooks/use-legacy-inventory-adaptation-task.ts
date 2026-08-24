"use client";

import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

export type QueueLegacyInventoryAdaptationInput = {
	salesOrderId: number;
	orderNo: string;
	legacyStatus: "AVAILABLE" | "ORDERED" | "PENDING ORDER";
	savedOrderUpdatedAt: string;
	forceRetry?: boolean;
};

export function useLegacyInventoryAdaptationTask() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const task = useTaskTrigger({ silent: true, monitor: true });

	const queue = async (input: QueueLegacyInventoryAdaptationInput) => {
		let response: Awaited<ReturnType<typeof task.trigger>> | undefined;
		try {
			response = await task.trigger(
				{
					taskName: "migrate-sales-inventory-legacy-status",
					payload: {
						salesOrderId: input.salesOrderId,
						legacyStatus: input.legacyStatus,
						savedOrderUpdatedAt: input.savedOrderUpdatedAt,
						forceRetry: input.forceRetry ?? false,
					},
				},
				{
					intent: {
						name: "sales.adapt-legacy-inventory",
						version: 1,
						args: {
							salesId: input.salesOrderId,
							orderNo: input.orderNo,
						},
					},
				},
			);
		} catch {
			response = undefined;
		}
		const data = response?.data as
			| {
					id?: string | null;
					errorMessage?: string | null;
			  }
			| undefined;
		if (data?.id) {
			toast({
				duration: 2500,
				title: "Legacy inventory adaptation queued",
				description: `${input.orderNo} will continue in the background.`,
			});
			return true;
		}

		await queryClient.invalidateQueries({
			queryKey: trpc.inventories.salesInventoryOverview.queryKey({
				salesOrderId: input.salesOrderId,
			}),
		});
		toast({
			duration: 60_000,
			variant: "destructive",
			title: "Legacy inventory adaptation was not queued",
			description:
				data?.errorMessage ||
				"The sale is saved. Open its Inventory tab to retry adaptation.",
		});
		return false;
	};

	return {
		queue,
		isQueueing: task.isActionPending,
	};
}
