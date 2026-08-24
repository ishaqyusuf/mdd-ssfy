import type { Db } from "@gnd/db";

import {
	getSalesInventoryProjectionErrorMessage,
	writeSalesInventoryProjectionReady,
	writeSalesInventoryProjectionState,
} from "./sales-inventory-projection-state";
import { cleanupSalesInventoryRepairResidue } from "./sales-inventory-repair";
import {
	type SyncSalesInventoryLineItemsInput,
	syncSalesInventoryLineItems,
} from "./sync-sales-inventory-line-items";

type RunSalesInventoryProjectionSyncDeps = {
	syncLineItems?: typeof syncSalesInventoryLineItems;
	cleanupRepairResidue?: typeof cleanupSalesInventoryRepairResidue;
};

export async function runSalesInventoryProjectionSync(
	db: Db,
	input: SyncSalesInventoryLineItemsInput,
	deps: RunSalesInventoryProjectionSyncDeps = {},
) {
	const source = input.source ?? "manual";
	const startedAt = new Date();
	await writeSalesInventoryProjectionState(db, {
			salesOrderId: input.salesOrderId,
			status: "syncing",
			source,
			startedAt,
	});

	try {
		return await db.$transaction(async (tx) => {
			const result = await (deps.syncLineItems ?? syncSalesInventoryLineItems)(
				tx,
				input,
			);
			const repair = await (
				deps.cleanupRepairResidue ?? cleanupSalesInventoryRepairResidue
			)(tx, {
				salesOrderId: input.salesOrderId,
			});
			const status = result.warnings.length ? "failed" : "ready";
			const lastError = result.warnings.length
				? result.warnings.join("\n").slice(0, 65_535)
				: null;
			const projection = await writeSalesInventoryProjectionReady(tx as Db, {
					salesOrderId: input.salesOrderId,
					source,
					lastError,
					startedAt,
			});

			return {
				...result,
				repair,
				projection: { ...projection, status },
			};
		});
	} catch (error) {
		await writeSalesInventoryProjectionState(db, {
				salesOrderId: input.salesOrderId,
				status: "failed",
				source,
			lastError: getSalesInventoryProjectionErrorMessage(error),
				startedAt,
				completedAt: new Date(),
		});
		throw error;
	}
}
