import { Prisma, type TransactionClient } from "@gnd/db";
import { getShortLoadInventoryContext } from "./fulfillment-short-load-inventory-context";
import { transitionInventoryDispatchAllocationsInTransaction } from "./sales-fulfillment-plan";

/** Enclosing command owns order/header locks, authorization, audit and idempotency. */
export async function reconcileShortLoadInventoryInTransaction(
	tx: TransactionClient,
	input: {
		salesId: number;
		fulfillmentId: number;
		expectedInventoryRevision: string;
		physicalReturnsConfirmed: boolean;
	},
) {
	const initial = await getShortLoadInventoryContext(tx, input);
	const ids = initial.components
		.map((component) => component.componentId)
		.sort((a, b) => a - b);
	if (ids.length)
		await tx.$queryRaw(
			Prisma.sql`SELECT id FROM LineItemComponents WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
		);
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM StockAllocation WHERE orderDeliveryId=${input.fulfillmentId} ORDER BY id FOR UPDATE`,
	);
	const context = await getShortLoadInventoryContext(tx, input);
	if (context.revision !== input.expectedInventoryRevision)
		throw new Error(
			"Inventory changed. Refresh before confirming the short load.",
		);
	if (context.requiresPhysicalReturn && !input.physicalReturnsConfirmed)
		throw new Error(
			"Confirm that excess picked inventory has been physically returned.",
		);
	if (context.releases.length) {
		const result = await transitionInventoryDispatchAllocationsInTransaction(
			tx,
			"release",
			{
				salesOrderId: input.salesId,
				orderDeliveryId: input.fulfillmentId,
				allocationSelections: context.releases.map((item) => ({
					allocationId: item.allocationId,
					qty: item.qty,
				})),
				note: "Confirmed fulfillment short load",
			},
		);
		if (result.transitionedCount !== context.releases.length)
			throw new Error(
				"Inventory release changed concurrently. Refresh before confirming the short load.",
			);
	}
	return context;
}
