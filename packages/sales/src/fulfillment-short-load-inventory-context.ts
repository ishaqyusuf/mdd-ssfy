import { createHash } from "node:crypto";
import type { Db, TransactionClient } from "@gnd/db";
import {
	dispatchItemQuantity,
	scaleDispatchComponentQuantity,
} from "./dispatch-manifest/inventory-quantities";
import { planShortLoadInventoryReconciliation } from "./fulfillment-short-load-inventory";

/** Read-only snapshot; execution must repeat this after taking the inventory locks. */
export async function getShortLoadInventoryContext(
	db: Db | TransactionClient,
	input: { salesId: number; fulfillmentId: number },
) {
	const packedRows = await db.orderItemDelivery.findMany({
		where: {
			orderId: input.salesId,
			orderDeliveryId: input.fulfillmentId,
			deletedAt: null,
			packingStatus: "packed",
		},
		select: { orderItemId: true, qty: true, lhQty: true, rhQty: true },
	});
	const packed = new Map<number, number>();
	for (const row of packedRows)
		packed.set(
			row.orderItemId,
			(packed.get(row.orderItemId) ?? 0) + dispatchItemQuantity(row),
		);
	const components = await db.lineItemComponents.findMany({
		where: {
			parent: { saleId: input.salesId, deletedAt: null, lineItemType: "SALE" },
			OR: [
				{
					required: true,
					status: { not: "cancelled" },
					parent: { salesItemId: { in: [...packed.keys()] } },
				},
				{
					stockAllocations: {
						some: {
							orderDeliveryId: input.fulfillmentId,
							deletedAt: null,
							status: { notIn: ["released", "cancelled"] },
						},
					},
				},
			],
		},
		orderBy: { id: "asc" },
		select: {
			id: true,
			qty: true,
			status: true,
			parent: { select: { qty: true, salesItemId: true } },
			stockAllocations: {
				where: { orderDeliveryId: input.fulfillmentId, deletedAt: null },
				orderBy: { id: "asc" },
				select: { id: true, qty: true, status: true },
			},
		},
	});
	const inputs = components.map((component) => {
		if (!component.parent.salesItemId || component.status === "cancelled")
			throw new Error(
				"Review the inventory component identity before confirming a short load.",
			);
		if (
			!component.parent.qty ||
			component.parent.qty <= 0 ||
			component.qty === null ||
			component.qty < 0
		)
			throw new Error(
				"Review the inventory component conversion before confirming a short load.",
			);
		return {
			componentId: component.id,
			packedRequirement: scaleDispatchComponentQuantity({
				componentQty: component.qty,
				orderedItemQty: component.parent.qty,
				dispatchItemQty: packed.get(component.parent.salesItemId) ?? 0,
			}),
			allocations: component.stockAllocations,
		};
	});
	const boundAllocations = await db.stockAllocation.findMany({
		where: {
			orderDeliveryId: input.fulfillmentId,
			deletedAt: null,
			status: { notIn: ["released", "cancelled"] },
		},
		select: { id: true, lineItemComponentId: true },
	});
	const owners = new Map(
		inputs.flatMap((component) =>
			component.allocations.map(
				(allocation) => [allocation.id, component.componentId] as const,
			),
		),
	);
	if (
		boundAllocations.some(
			(allocation) =>
				owners.get(allocation.id) !== allocation.lineItemComponentId,
		)
	)
		throw new Error(
			"A dispatch allocation does not belong to the order's inventory components. Review inventory links.",
		);
	const revision = createHash("sha256")
		.update(JSON.stringify(inputs))
		.digest("hex");
	return {
		revision,
		...planShortLoadInventoryReconciliation(inputs),
		components: inputs,
	};
}
