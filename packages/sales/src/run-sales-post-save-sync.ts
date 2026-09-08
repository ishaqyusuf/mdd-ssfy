import { Prisma, type Db } from "@gnd/db";
import { salesCompletionProjectionSourceRevision } from "./sales-completion";
import { resetSalesAction } from "./sales-control/actions";
import { refreshSalesOrderListProjections } from "./order-list-projection-builder";
import { runSalesInventoryProjectionSync } from "./run-sales-inventory-projection-sync";
import type { SyncSalesInventoryLineItemsInput } from "./sync-sales-inventory-line-items";

/** Rebuild derived controls under the same order lock used by workflow commands. */
async function publishSalesOrderSummary(
	db: Db,
	salesOrderId: number,
	rebuild: boolean,
) {
	return db.$transaction(
		async (tx) => {
			const rows = await tx.$queryRaw<
				Array<{ id: number; updatedAt: Date }>
			>(Prisma.sql`
      SELECT id, updatedAt FROM SalesOrders
      WHERE id = ${salesOrderId} AND deletedAt IS NULL FOR UPDATE
    `);
			const order = rows[0];
			if (!order) return { skipped: true };
			// This reconstructs totals from saved lines and actual operational history.
			// It does not assign, submit, pack, dispatch, or complete any work.
			// The legacy helper accepts the full client type but only uses model delegates.
			if (rebuild) await resetSalesAction(tx as Db, salesOrderId);
			const source = await tx.salesOrders.findUniqueOrThrow({
				where: { id: salesOrderId },
				select: {
					updatedAt: true,
					createdAt: true,
					completionRecords: { select: { updatedAt: true } },
				},
			});
			const projection = await refreshSalesOrderListProjections(tx, [
				{
					salesOrderId,
					sourceUpdatedAt: salesCompletionProjectionSourceRevision(source),
				},
			]);
			if (projection.persisted !== 1)
				throw new Error(
					"Sales summary changed during calibration; retry required.",
				);
			return { skipped: false };
		},
		{ timeout: 60_000 },
	);
}

export async function calibrateSalesOrder(db: Db, salesOrderId: number) {
	return publishSalesOrderSummary(db, salesOrderId, true);
}

async function refreshSalesOrderSummary(db: Db, salesOrderId: number) {
	return publishSalesOrderSummary(db, salesOrderId, false);
}

type Dependencies = {
	calibrate?: typeof calibrateSalesOrder;
	syncInventory?: typeof runSalesInventoryProjectionSync;
	refreshSummary?: typeof refreshSalesOrderSummary;
};

/** Publish initial workflow scope even if the independent inventory sync fails. */
export async function runSalesPostSaveSync(
	db: Db,
	input: SyncSalesInventoryLineItemsInput & { skipInventory?: boolean },
	deps: Dependencies = {},
) {
	const calibration = await (deps.calibrate ?? calibrateSalesOrder)(
		db,
		input.salesOrderId,
	);
	if (calibration.skipped || input.skipInventory) return { calibration };
	try {
		const inventory = await (
			deps.syncInventory ?? runSalesInventoryProjectionSync
		)(db, input);
		return { ...inventory, calibration };
	} finally {
		// Publish inventory alerts as well, without rebuilding controls a second time.
		await (deps.refreshSummary ?? refreshSalesOrderSummary)(
			db,
			input.salesOrderId,
		);
	}
}
