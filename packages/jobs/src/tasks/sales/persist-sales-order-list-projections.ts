import { db } from "@gnd/db";
import {
	SALES_ORDER_LIST_PROJECTION_VERSION,
	refreshSalesOrderListProjections,
} from "@gnd/sales";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const persistSalesOrderListProjectionsSchema = z.object({
	orders: z
		.array(
			z.object({
				salesOrderId: z.number().int().positive(),
				sourceUpdatedAt: z.string().datetime(),
			}),
		)
		.min(1)
		.max(100),
});

export const persistSalesOrderListProjectionsTask = schemaTask({
	id: "persist-sales-order-list-projections",
	schema: persistSalesOrderListProjectionsSchema,
	maxDuration: 300,
	queue: {
		concurrencyLimit: 1,
	},
	run: async ({ orders }) => {
		const result = await refreshSalesOrderListProjections(
			db,
			orders.map((order) => ({
				salesOrderId: order.salesOrderId,
				sourceUpdatedAt: new Date(order.sourceUpdatedAt),
			})),
		);

		logger.info("Sales order list projections refreshed", {
			...result,
			version: SALES_ORDER_LIST_PROJECTION_VERSION,
		});

		return {
			...result,
			version: SALES_ORDER_LIST_PROJECTION_VERSION,
		};
	},
});
