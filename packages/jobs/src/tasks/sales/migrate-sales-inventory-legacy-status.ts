import { userHasPermission } from "@gnd/auth/utils";
import { type Db, db } from "@gnd/db";
import { normalizeSalesInventoryLegacyStatus } from "@gnd/sales/sales-inventory-legacy-compatibility";
import {
	StaleSalesInventoryLegacyMigrationError,
	resolveSalesInventoryLegacyStatusMigration,
} from "@gnd/sales/sales-inventory-legacy-status-setup";
import {
	writeSalesInventoryProjectionFailureIfCurrent,
	writeSalesInventoryProjectionSyncingIfCurrent,
} from "@gnd/sales/sales-inventory-projection-state";
import { AbortTaskRunError, schemaTask } from "@trigger.dev/sdk/v3";

import {
	type MigrateSalesInventoryLegacyStatusTaskPayload,
	type TaskName,
	migrateSalesInventoryLegacyStatusSchemaTask,
} from "../../schema";

type RunLegacyMigrationDeps = {
	hasPermission?: typeof userHasPermission;
	resolveMigration?: typeof resolveSalesInventoryLegacyStatusMigration;
	writeFailure?: typeof writeSalesInventoryProjectionFailureIfCurrent;
	writeSyncing?: typeof writeSalesInventoryProjectionSyncingIfCurrent;
};

export async function runMigrateSalesInventoryLegacyStatus(
	database: Db,
	payload: MigrateSalesInventoryLegacyStatusTaskPayload,
	deps: RunLegacyMigrationDeps = {},
) {
	const expectedSalesUpdatedAt = new Date(payload.savedOrderUpdatedAt);
	const startedAt = new Date();
	const hasPermission = deps.hasPermission ?? userHasPermission;
	const writeFailure =
		deps.writeFailure ?? writeSalesInventoryProjectionFailureIfCurrent;
	const failureInput = {
		salesOrderId: payload.salesOrderId,
		legacyStatus: payload.legacyStatus,
		expectedSalesUpdatedAt,
		source: "legacy-status",
		startedAt,
	};

	if (!(await hasPermission(database, payload.actor.id, "editOrders"))) {
		const error = new Error(
			"The user who queued this task no longer has permission to edit orders.",
		);
		await writeFailure(database, { ...failureInput, error });
		throw new AbortTaskRunError(error.message);
	}

	const currentOrder = await database.salesOrders.findFirst({
		where: {
			id: payload.salesOrderId,
			deletedAt: null,
			type: "order",
			updatedAt: expectedSalesUpdatedAt,
		},
		select: { id: true, inventoryStatus: true },
	});
	if (
		!currentOrder ||
		normalizeSalesInventoryLegacyStatus(currentOrder.inventoryStatus) !==
			payload.legacyStatus
	) {
		return { result: "stale" as const, salesOrderId: payload.salesOrderId };
	}
	const started = await (
		deps.writeSyncing ?? writeSalesInventoryProjectionSyncingIfCurrent
	)(database, {
		salesOrderId: payload.salesOrderId,
		legacyStatus: payload.legacyStatus,
		expectedSalesUpdatedAt,
		source: "legacy-status",
		startedAt,
	});
	if (!started) {
		return { result: "stale" as const, salesOrderId: payload.salesOrderId };
	}

	try {
		return await (
			deps.resolveMigration ?? resolveSalesInventoryLegacyStatusMigration
		)(database, {
			salesOrderId: payload.salesOrderId,
			action: "continue",
			legacyStatus: payload.legacyStatus,
			expectedSalesUpdatedAt,
			authorName: payload.actor.name,
			triggeredByUserId: payload.actor.id,
		});
	} catch (error) {
		if (error instanceof StaleSalesInventoryLegacyMigrationError) {
			return { result: "stale" as const, salesOrderId: payload.salesOrderId };
		}
		await writeFailure(database, { ...failureInput, error });
		throw error;
	}
}

export const migrateSalesInventoryLegacyStatusTask = schemaTask({
	id: "migrate-sales-inventory-legacy-status" as TaskName,
	schema: migrateSalesInventoryLegacyStatusSchemaTask,
	maxDuration: 120,
	retry: {
		maxAttempts: 3,
		factor: 2,
		minTimeoutInMs: 1_000,
		maxTimeoutInMs: 10_000,
		randomize: true,
	},
	queue: { concurrencyLimit: 10 },
	run: async (payload) => runMigrateSalesInventoryLegacyStatus(db, payload),
});
