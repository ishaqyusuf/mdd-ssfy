function quantity(value: unknown) {
	return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

export function dispatchItemQuantity(input: {
	qty?: unknown;
	lhQty?: unknown;
	rhQty?: unknown;
}) {
	const scalarQty = quantity(input.qty);
	return scalarQty > 0
		? scalarQty
		: quantity(quantity(input.lhQty) + quantity(input.rhQty));
}

export function scaleDispatchComponentQuantity(input: {
	componentQty: unknown;
	orderedItemQty: unknown;
	dispatchItemQty: unknown;
}) {
	const componentQty = quantity(input.componentQty);
	const orderedItemQty = quantity(input.orderedItemQty);
	const dispatchItemQty = quantity(input.dispatchItemQty);
	if (componentQty <= 0 || dispatchItemQty <= 0) return 0;
	if (orderedItemQty <= 0) return componentQty;
	return quantity(
		Math.min(componentQty, componentQty * (dispatchItemQty / orderedItemQty)),
	);
}

export type DispatchInventoryScopeSource =
	| "sale"
	| "requested_items"
	| "delivery_items"
	| "sole_active_dispatch"
	| "unresolved";

type DispatchInventoryScopeItem = {
	salesItemId: number;
	qty?: unknown;
	lhQty?: unknown;
	rhQty?: unknown;
};

/**
 * Resolves the exact inventory sales-line scope for a dispatch without relying
 * on legacy SalesItemControl rows. A sale-wide fallback is only safe when the
 * current delivery is the sole active delivery for the sale.
 */
export function resolveDispatchInventoryScope(input: {
	lineSalesItemIds: number[];
	orderDeliveryId?: number | null;
	requestedItems?: DispatchInventoryScopeItem[];
	deliveryItems?: DispatchInventoryScopeItem[];
	activeDispatchIds?: number[];
}) {
	const inventorySalesItemIds = new Set(input.lineSalesItemIds);
	const requestedItems = input.requestedItems?.filter((item) =>
		inventorySalesItemIds.has(item.salesItemId),
	);
	const deliveryItems = (input.deliveryItems || []).filter((item) =>
		inventorySalesItemIds.has(item.salesItemId),
	);
	const scopedItems =
		input.requestedItems !== undefined ? requestedItems || [] : deliveryItems;
	const source: DispatchInventoryScopeSource =
		input.requestedItems !== undefined
			? "requested_items"
			: deliveryItems.length
				? "delivery_items"
				: !input.orderDeliveryId
					? "sale"
					: input.activeDispatchIds?.length === 1 &&
							input.activeDispatchIds[0] === input.orderDeliveryId
						? "sole_active_dispatch"
						: "unresolved";
	const quantityBySalesItemId = new Map<number, number>();
	for (const item of scopedItems) {
		quantityBySalesItemId.set(
			item.salesItemId,
			quantity(
				(quantityBySalesItemId.get(item.salesItemId) || 0) +
					dispatchItemQuantity(item),
			),
		);
	}
	const salesItemIds =
		source === "sale" || source === "sole_active_dispatch"
			? [...inventorySalesItemIds]
			: [...quantityBySalesItemId.keys()];

	return {
		source,
		resolved: source !== "unresolved",
		salesItemIds,
		quantityBySalesItemId,
	};
}
