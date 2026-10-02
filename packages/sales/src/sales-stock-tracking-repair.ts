import type { Db, TransactionClient } from "@gnd/db";
import { StockAdjustmentError, getCategoryStockPolicy } from "@gnd/inventory";
import { z } from "zod";
import { runSalesInventoryProjectionSync } from "./run-sales-inventory-projection-sync";
import { getSalesInventoryOverview } from "./sales-inventory-overview";

export const repairStockTrackingSchema = z.object({
	inventoryCategoryId: z.number().int().positive(),
	salesOrderIds: z.array(z.number().int().positive()).min(1).max(50),
});

async function assertEditableTrackingOrder(
	db: Db | TransactionClient,
	salesOrderId: number,
	categoryId: number,
) {
	const sale = await db.salesOrders.findFirst({
		where: {
			id: salesOrderId,
			type: "order",
			archivedAt: null,
			deletedAt: null,
		},
		select: { id: true },
	});
	const category = await db.inventoryCategory.findFirst({
		where: {
			id: categoryId,
			deletedAt: null,
			stockMode: "monitored",
			productKind: { not: "component" },
		},
		select: { id: true },
	});
	const overview = sale
		? await getSalesInventoryOverview(db, { salesOrderId })
		: null;
	if (!category || !overview?.capabilities.canSync)
		throw new StockAdjustmentError(
			"CONFLICT",
			"The order or stock policy changed. Review eligibility again.",
		);
}

export async function repairSalesStockTracking(
	db: Db,
	input: z.infer<typeof repairStockTrackingSchema>,
	actorUserId: number,
) {
	const policy = await getCategoryStockPolicy(db, {
		categoryId: input.inventoryCategoryId,
	});
	if (!policy.tracked)
		throw new StockAdjustmentError(
			"CONFLICT",
			"Enable stock tracking before refreshing these needs.",
		);
	const category = await db.inventoryCategory.findUniqueOrThrow({
		where: { id: policy.categoryId },
		select: { uid: true },
	});
	const ids = [...new Set(input.salesOrderIds)];
	const orders = await db.salesOrders.findMany({
		where: {
			id: { in: ids },
			type: "order",
			deletedAt: null,
			archivedAt: null,
			OR: [
				{
					lineItems: {
						some: {
							deletedAt: null,
							components: {
								some: {
									inventoryCategoryId: policy.categoryId,
									status: { not: "cancelled" },
								},
							},
						},
					},
				},
				{
					formSteps: {
						some: {
							deletedAt: null,
							step: { uid: category.uid, deletedAt: null },
						},
					},
				},
			],
		},
		select: { id: true, orderId: true },
	});
	if (orders.length !== ids.length)
		throw new StockAdjustmentError(
			"CONFLICT",
			"Some selected orders are archived, historical, quotes, or no longer use this category. Review the list again.",
		);
	for (const order of orders) {
		const overview = await getSalesInventoryOverview(db, {
			salesOrderId: order.id,
		});
		if (!overview?.capabilities.canSync)
			throw new StockAdjustmentError(
				"CONFLICT",
				`Order ${order.orderId} is read-only. Review the list again.`,
			);
	}
	const results: Array<{
		salesOrderId: number;
		orderId: string;
		state: "ready" | "failed";
		message: string | null;
	}> = [];
	for (const order of orders) {
		try {
			const result = await runSalesInventoryProjectionSync(
				db,
				{
					salesOrderId: order.id,
					source: "repair",
					triggeredByUserId: actorUserId,
				},
				{
					beforeSync: (tx) =>
						assertEditableTrackingOrder(tx, order.id, policy.categoryId),
				},
			);
			results.push({
				salesOrderId: order.id,
				orderId: order.orderId,
				state: result.projection.status === "ready" ? "ready" : "failed",
				message: result.warnings.length ? result.warnings.join("\n") : null,
			});
		} catch (error) {
			results.push({
				salesOrderId: order.id,
				orderId: order.orderId,
				state: "failed",
				message:
					error instanceof Error
						? error.message
						: "Needs could not be refreshed.",
			});
		}
	}
	return { results };
}
