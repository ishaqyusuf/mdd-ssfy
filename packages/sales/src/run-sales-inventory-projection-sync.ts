import type { Db } from "@gnd/db";

import { SALES_INVENTORY_PROJECTION_VERSION } from "./sales-inventory-applicability";
import {
	type SyncSalesInventoryLineItemsInput,
	syncSalesInventoryLineItems,
} from "./sync-sales-inventory-line-items";

type RunSalesInventoryProjectionSyncDeps = {
	syncLineItems?: typeof syncSalesInventoryLineItems;
};

function projectionWrite(input: {
	salesOrderId: number;
	status: "syncing" | "ready" | "failed";
	source: string;
	needCount?: number;
	requiredQty?: number;
	lastError?: string | null;
	startedAt?: Date | null;
	completedAt?: Date | null;
}) {
	const shared = {
		status: input.status,
		version: SALES_INVENTORY_PROJECTION_VERSION,
		needCount: input.needCount ?? 0,
		requiredQty: input.requiredQty ?? 0,
		source: input.source,
		lastError: input.lastError ?? null,
		startedAt: input.startedAt ?? null,
		completedAt: input.completedAt ?? null,
	};

	return {
		where: {
			salesOrderId: input.salesOrderId,
		},
		create: {
			salesOrderId: input.salesOrderId,
			...shared,
		},
		update: shared,
	};
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

export async function runSalesInventoryProjectionSync(
	db: Db,
	input: SyncSalesInventoryLineItemsInput,
	deps: RunSalesInventoryProjectionSyncDeps = {},
) {
	const source = input.source ?? "manual";
	const startedAt = new Date();
	await db.salesInventoryProjectionState.upsert(
		projectionWrite({
			salesOrderId: input.salesOrderId,
			status: "syncing",
			source,
			startedAt,
		}),
	);

	try {
		return await db.$transaction(async (tx) => {
			const result = await (deps.syncLineItems ?? syncSalesInventoryLineItems)(
				tx,
				input,
			);
			const requirements = await tx.lineItemComponents.aggregate({
				where: {
					required: true,
					qty: {
						gt: 0,
					},
					parent: {
						is: {
							saleId: input.salesOrderId,
							deletedAt: null,
							lineItemType: "SALE",
						},
					},
				},
				_count: {
					_all: true,
				},
				_sum: {
					qty: true,
				},
			});
			const needCount = requirements._count._all;
			const requiredQty = Number(requirements._sum.qty || 0);
			const status = result.warnings.length ? "failed" : "ready";
			const lastError = result.warnings.length
				? result.warnings.join("\n").slice(0, 65_535)
				: null;

			await tx.salesInventoryProjectionState.upsert(
				projectionWrite({
					salesOrderId: input.salesOrderId,
					status,
					source,
					needCount,
					requiredQty,
					lastError,
					startedAt,
					completedAt: new Date(),
				}),
			);

			return {
				...result,
				projection: {
					status,
					needCount,
					requiredQty,
				},
			};
		});
	} catch (error) {
		await db.salesInventoryProjectionState.upsert(
			projectionWrite({
				salesOrderId: input.salesOrderId,
				status: "failed",
				source,
				lastError: errorMessage(error).slice(0, 65_535),
				startedAt,
				completedAt: new Date(),
			}),
		);
		throw error;
	}
}
