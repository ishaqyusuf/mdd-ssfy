"use client";

import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { toast } from "@gnd/ui/use-toast";
import { useSalesQueryClient } from "./use-sales-query-client";

export type QueueLegacyInventoryAdaptationInput = {
	salesOrderId: number;
	orderNo: string;
	legacyStatus: "AVAILABLE" | "ORDERED" | "PENDING ORDER";
	savedOrderUpdatedAt: string;
	forceRetry?: boolean;
	retryRevision?: string;
};

export function useLegacyInventoryAdaptationTask() {
	const salesQueries = useSalesQueryClient();
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
						retryRevision: input.retryRevision,
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

		await salesQueries.events.legacyInventoryAdapted({
			orderNo: input.orderNo,
			salesId: input.salesOrderId,
			salesType: "order",
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
