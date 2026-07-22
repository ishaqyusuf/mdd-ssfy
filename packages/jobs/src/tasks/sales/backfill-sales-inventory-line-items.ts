import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  backfillSalesInventoryLineItemsSchemaTask,
  type BackfillSalesInventoryLineItemsSchemaTask,
  type TaskName,
} from "../../schema";
import { db, type Prisma } from "@gnd/db";
import { syncSalesInventoryLineItems } from "@gnd/sales/sync-sales-inventory-line-items";

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
        await db.$transaction((tx) =>
          syncSalesInventoryLineItems(tx, {
            salesOrderId: order.id,
            source: payload.source,
            triggeredByUserId: payload.triggeredByUserId ?? null,
          }),
        );
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
