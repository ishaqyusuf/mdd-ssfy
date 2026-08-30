import { type Prisma, db } from "@gnd/db";
import { runSalesInventoryProjectionSync } from "@gnd/sales/run-sales-inventory-projection-sync";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
	type BackfillSalesInventoryLineItemsSchemaTask,
	type TaskName,
	backfillSalesInventoryLineItemsSchemaTask,
} from "../../schema";

const id: TaskName = "backfill-sales-inventory-line-items";

export function getBackfillSalesInventoryLineItemsTake(
	payload: Pick<
		BackfillSalesInventoryLineItemsSchemaTask,
		"salesOrderIds" | "batchSize"
	>,
) {
	return payload.salesOrderIds?.length
		? payload.salesOrderIds.length
		: (payload.batchSize ?? 50);
}

export function getSalesInventoryBackfillFailure(result: {
	projection: { status: string; lastError?: string | null };
	warnings?: string[];
}) {
	if (result.projection.status === "ready") return null;
	return (
		result.warnings?.filter(Boolean).join("\n") ||
		result.projection.lastError ||
		`Inventory projection returned ${result.projection.status}.`
	);
}

export const backfillSalesInventoryLineItemsTask = schemaTask({
	id,
	schema: backfillSalesInventoryLineItemsSchemaTask,
	maxDuration: 900,
	queue: {
		concurrencyLimit: 2,
	},
	run: async (payload) => {
		const salesOrderIds = payload.salesOrderIds?.length
			? payload.salesOrderIds
			: null;
		const where: Prisma.SalesOrdersWhereInput = salesOrderIds
			? {
					id: {
						in: salesOrderIds,
					},
				}
			: {
					deletedAt: null,
					id: {
						gt: payload.cursorId ?? 0,
					},
					...(payload.includeAlreadySynced
						? {}
						: {
								lineItems: {
									none: {
										deletedAt: null,
										lineItemType: "SALE",
									},
								},
							}),
				};

		const orders = await db.salesOrders.findMany({
			where,
			orderBy: {
				id: "asc",
			},
			take: getBackfillSalesInventoryLineItemsTake(payload),
			select: {
				id: true,
				orderId: true,
			},
		});

		const results: Array<{
			salesOrderId: number;
			orderId: string;
			ok: boolean;
			error?: string;
		}> = [];

		for (const order of orders) {
			try {
				const syncResult = await runSalesInventoryProjectionSync(db, {
					salesOrderId: order.id,
					source: payload.source,
					triggeredByUserId: payload.triggeredByUserId ?? null,
				});
				const failure = getSalesInventoryBackfillFailure(syncResult);
				if (failure) throw new Error(failure);
				results.push({
					salesOrderId: order.id,
					orderId: order.orderId,
					ok: true,
				});
			} catch (error) {
				results.push({
					salesOrderId: order.id,
					orderId: order.orderId,
					ok: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		const lastOrder = orders.at(-1);

		return {
			processedCount: results.length,
			succeededCount: results.filter((result) => result.ok).length,
			failedCount: results.filter((result) => !result.ok).length,
			nextCursorId: salesOrderIds ? null : (lastOrder?.id ?? null),
			hasMore: !salesOrderIds && orders.length === payload.batchSize,
			results,
		};
	},
});
