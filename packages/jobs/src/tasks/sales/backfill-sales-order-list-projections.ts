import { db } from "@gnd/db";
import { refreshSalesOrderListProjections } from "@gnd/sales";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const backfillSalesOrderListProjectionsSchema = z.object({
	cursorId: z.number().int().nonnegative().default(0),
	batchSize: z.number().int().min(1).max(100).default(50),
	maxBatches: z.number().int().min(1).max(20).default(10),
	includeDeleted: z.boolean().default(false),
});

export const backfillSalesOrderListProjectionsTask = schemaTask({
	id: "backfill-sales-order-list-projections",
	schema: backfillSalesOrderListProjectionsSchema,
	maxDuration: 900,
	queue: {
		concurrencyLimit: 1,
	},
	run: async ({ cursorId, batchSize, maxBatches, includeDeleted }) => {
		let cursor = cursorId;
		let persisted = 0;
		let skippedAsStale = 0;
		let processedBatches = 0;
		let hasMore = false;

		for (let batch = 0; batch < maxBatches; batch += 1) {
			const rows = await db.salesOrders.findMany({
				where: {
					id: { gt: cursor },
					type: "order",
					...(includeDeleted ? {} : { deletedAt: null }),
				},
				orderBy: { id: "asc" },
				take: batchSize + 1,
				select: { id: true, createdAt: true, updatedAt: true },
			});
			const page = rows.slice(0, batchSize);
			hasMore = rows.length > batchSize;
			if (!page.length) break;

			const result = await refreshSalesOrderListProjections(
				db,
				page.map((row) => ({
					salesOrderId: row.id,
					sourceUpdatedAt:
						row.updatedAt ?? row.createdAt ?? new Date(0),
				})),
			);
			persisted += result.persisted;
			skippedAsStale += result.skippedAsStale;
			processedBatches += 1;
			cursor = page.at(-1)!.id;
			if (!hasMore) break;
		}

		const result = {
			cursorId: cursor,
			nextCursorId: hasMore ? cursor : null,
			hasMore,
			processedBatches,
			persisted,
			skippedAsStale,
		};
		logger.info("Sales order list projection backfill batch complete", result);
		return result;
	},
});
