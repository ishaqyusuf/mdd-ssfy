import type { Db } from "@gnd/db";

import { SALES_INVENTORY_PROJECTION_VERSION } from "./sales-inventory-applicability";
import { normalizeSalesInventoryLegacyStatus } from "./sales-inventory-legacy-compatibility";
import { resolveSalesInventoryTrackingPolicy } from "./sales-inventory-tracking-policy";

export type SalesInventoryProjectionLifecycleStatus =
	| "syncing"
	| "ready"
	| "failed";

export type SalesInventoryProjectionStateWriteInput = {
	salesOrderId: number;
	status: SalesInventoryProjectionLifecycleStatus;
	source: string;
	needCount?: number;
	requiredQty?: number;
	lastError?: string | null;
	startedAt?: Date | null;
	completedAt?: Date | null;
};

export function salesInventoryProjectionStateWrite(
	input: SalesInventoryProjectionStateWriteInput,
) {
	const shared = {
		status: input.status,
		version: SALES_INVENTORY_PROJECTION_VERSION,
		needCount: input.needCount ?? 0,
		requiredQty: input.requiredQty ?? 0,
		source: input.source,
		lastError: input.lastError?.slice(0, 65_535) ?? null,
		startedAt: input.startedAt ?? null,
		completedAt: input.completedAt ?? null,
	};

	return {
		where: { salesOrderId: input.salesOrderId },
		create: { salesOrderId: input.salesOrderId, ...shared },
		update: shared,
	};
}

export async function writeSalesInventoryProjectionState(
	db: Db,
	input: SalesInventoryProjectionStateWriteInput,
) {
	await db.salesInventoryProjectionState.upsert(
		salesInventoryProjectionStateWrite(input),
	);
}

export async function writeSalesInventoryProjectionReady(
	db: Db,
	input: {
		salesOrderId: number;
		source: string;
		startedAt: Date;
		lastError?: string | null;
	},
) {
	const requirements = await db.lineItemComponents.findMany({
		where: {
			required: true,
			qty: { gt: 0 },
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
				select: { id: true, productKind: true, stockMode: true },
			},
			inventoryVariant: { select: { id: true } },
			inventoryCategory: {
				select: { productKind: true, stockMode: true },
			},
			subComponent: {
				select: {
					defaultInventory: {
						select: { id: true, productKind: true, stockMode: true },
					},
					inventoryCategory: {
						select: { productKind: true, stockMode: true },
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
		(total, requirement) => total + Math.max(0, Number(requirement.qty || 0)),
		0,
	);
	const status = input.lastError ? ("failed" as const) : ("ready" as const);

	await writeSalesInventoryProjectionState(db, {
		salesOrderId: input.salesOrderId,
		status,
		source: input.source,
		needCount,
		requiredQty,
		lastError: input.lastError ?? null,
		startedAt: input.startedAt,
		completedAt: new Date(),
	});

	return { status, needCount, requiredQty };
}

export function getSalesInventoryProjectionErrorMessage(error: unknown) {
	return (error instanceof Error ? error.message : String(error)).slice(
		0,
		65_535,
	);
}

export async function writeSalesInventoryProjectionFailureIfCurrent(
	db: Db,
	input: {
		salesOrderId: number;
		legacyStatus: string;
		expectedSalesUpdatedAt: Date;
		source: string;
		error: unknown;
		startedAt?: Date | null;
	},
) {
	return db.$transaction(async (tx) => {
		if (typeof (tx as Db).$queryRaw === "function") {
			await (tx as Db)
				.$queryRaw`SELECT id FROM SalesOrders WHERE id = ${input.salesOrderId} FOR UPDATE`;
		}
		const currentOrder = await tx.salesOrders.findFirst({
			where: {
				id: input.salesOrderId,
				deletedAt: null,
				type: "order",
				updatedAt: input.expectedSalesUpdatedAt,
			},
			select: { id: true, inventoryStatus: true },
		});
		if (
			!currentOrder ||
			normalizeSalesInventoryLegacyStatus(currentOrder.inventoryStatus) !==
				normalizeSalesInventoryLegacyStatus(input.legacyStatus)
		)
			return false;

		await writeSalesInventoryProjectionState(tx as Db, {
			salesOrderId: input.salesOrderId,
			status: "failed",
			source: input.source,
			lastError: getSalesInventoryProjectionErrorMessage(input.error),
			startedAt: input.startedAt ?? new Date(),
			completedAt: new Date(),
		});
		return true;
	});
}

export async function writeSalesInventoryProjectionSyncingIfCurrent(
	db: Db,
	input: {
		salesOrderId: number;
		legacyStatus: string;
		expectedSalesUpdatedAt: Date;
		source: string;
		startedAt: Date;
	},
) {
	return db.$transaction(async (tx) => {
		if (typeof (tx as Db).$queryRaw === "function") {
			await (tx as Db)
				.$queryRaw`SELECT id FROM SalesOrders WHERE id = ${input.salesOrderId} FOR UPDATE`;
		}
		const currentOrder = await tx.salesOrders.findFirst({
			where: {
				id: input.salesOrderId,
				deletedAt: null,
				type: "order",
				updatedAt: input.expectedSalesUpdatedAt,
			},
			select: { id: true, inventoryStatus: true },
		});
		if (
			!currentOrder ||
			normalizeSalesInventoryLegacyStatus(currentOrder.inventoryStatus) !==
				normalizeSalesInventoryLegacyStatus(input.legacyStatus)
		)
			return false;

		await writeSalesInventoryProjectionState(tx as Db, {
			salesOrderId: input.salesOrderId,
			status: "syncing",
			source: input.source,
			startedAt: input.startedAt,
		});
		return true;
	});
}
