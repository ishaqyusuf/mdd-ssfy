import type { Db } from "@gnd/db";

import { SALES_INVENTORY_PROJECTION_VERSION } from "./sales-inventory-applicability";
import { cleanupSalesInventoryRepairResidue } from "./sales-inventory-repair";
import { resolveSalesInventoryTrackingPolicy } from "./sales-inventory-tracking-policy";
import {
	type SyncSalesInventoryLineItemsInput,
	syncSalesInventoryLineItems,
} from "./sync-sales-inventory-line-items";

type RunSalesInventoryProjectionSyncDeps = {
	syncLineItems?: typeof syncSalesInventoryLineItems;
	cleanupRepairResidue?: typeof cleanupSalesInventoryRepairResidue;
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
			const repair = await (
				deps.cleanupRepairResidue ?? cleanupSalesInventoryRepairResidue
			)(tx, {
				salesOrderId: input.salesOrderId,
			});
			const requirements = await tx.lineItemComponents.findMany({
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
				select: {
					qty: true,
					inventoryId: true,
					inventoryVariantId: true,
					inventory: {
						select: {
							id: true,
							productKind: true,
							stockMode: true,
						},
					},
					inventoryVariant: {
						select: {
							id: true,
						},
					},
					inventoryCategory: {
						select: {
							productKind: true,
							stockMode: true,
						},
					},
					subComponent: {
						select: {
							defaultInventory: {
								select: {
									id: true,
									productKind: true,
									stockMode: true,
								},
							},
							inventoryCategory: {
								select: {
									productKind: true,
									stockMode: true,
								},
							},
						},
					},
				},
			});
			const trackedRequirements = requirements.filter(
				(requirement) =>
					resolveSalesInventoryTrackingPolicy(requirement) === "tracked",
			);
			const needCount = trackedRequirements.length;
			const requiredQty = trackedRequirements.reduce(
				(total, requirement) =>
					total + Math.max(0, Number(requirement.qty || 0)),
				0,
			);
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
				repair,
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
