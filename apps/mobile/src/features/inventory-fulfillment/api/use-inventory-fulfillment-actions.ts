import { _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import type { DeliveryOption } from "@gnd/utils/sales";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { InventoryFulfillmentItem } from "../lib/inventory-fulfillment-model";

export function useInventoryFulfillmentActions() {
	const queryClient = useQueryClient();
	const invalidate = useCallback(
		async () =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: _trpc.inventories.salesBackorderQueue.queryKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: _trpc.inventories.salesBackorderQueueSummary.queryKey(),
				}),
				queryClient.invalidateQueries({
					queryKey:
						_trpc.inventories.salesBackorderQueuePrintSelection.queryKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: _trpc.inventories.salesPartialShipmentQueue.queryKey(),
				}),
				queryClient.invalidateQueries({
					queryKey:
						_trpc.inventories.salesPartialShipmentQueueSummary.queryKey(),
				}),
			]),
		[queryClient],
	);
	const holdMutation = useMutation(
		_trpc.inventories.setSalesInventoryLineFulfillmentHold.mutationOptions(),
	);
	const shipMutation = useMutation(
		_trpc.inventories.shipAvailableSalesInventory.mutationOptions(),
	);

	async function setHold(items: InventoryFulfillmentItem[], hold: boolean) {
		const actionableItems = items.filter(
			(item): item is InventoryFulfillmentItem & { lineItemId: number } =>
				typeof item.lineItemId === "number",
		);
		if (actionableItems.length !== items.length) {
			Toast.show("One or more selected lines are unavailable.", {
				type: "warning",
			});
			return;
		}
		await Promise.all(
			actionableItems.map((item) =>
				holdMutation.mutateAsync({
					lineItemId: item.lineItemId,
					holdUntilComplete: hold,
					note: hold
						? "Held until complete from mobile."
						: "Partial shipment allowed from mobile.",
				}),
			),
		);
		await invalidate();
		Toast.show(
			hold
				? "Selected lines are now held."
				: "Partial shipment is now allowed.",
			{ type: "success" },
		);
	}

	async function ship(input: {
		items: InventoryFulfillmentItem[];
		deliveryMode: DeliveryOption;
		deliveredTo?: string | null;
		note?: string | null;
	}) {
		const first = input.items[0];
		const lineItemIds = input.items
			.map((item) => item.lineItemId)
			.filter((id): id is number => typeof id === "number");
		if (!first?.salesOrderId || lineItemIds.length !== input.items.length) {
			Toast.show("Select valid lines from one sales order.", {
				type: "warning",
			});
			throw new Error("Invalid inventory shipment selection.");
		}
		const result = await shipMutation.mutateAsync({
			salesOrderId: first.salesOrderId,
			lineItemIds,
			deliveryMode: input.deliveryMode,
			deliveredTo: input.deliveredTo,
			note: input.note,
		});
		await invalidate();
		Toast.show(
			`${result.shippedQty} shipped, ${result.backorderedQty} remaining.`,
			{ type: result.ok ? "success" : "warning" },
		);
		return result;
	}

	return {
		setHold,
		ship,
		isHolding: holdMutation.isPending,
		isShipping: shipMutation.isPending,
	};
}
