import type { RecognizedSalesInventoryLegacyStatus } from "./sales-inventory-legacy-compatibility";

export function getSalesInventoryLegacyMigrationIdempotencyKey(input: {
	salesOrderId: number;
	legacyStatus: RecognizedSalesInventoryLegacyStatus;
	savedOrderUpdatedAt: string;
	retryRevision?: string;
}) {
	return [
		"sales-inventory-legacy",
		input.salesOrderId,
		input.legacyStatus,
		input.savedOrderUpdatedAt,
		...(input.retryRevision ? ["retry", input.retryRevision] : []),
	].join(":");
}

export const SALES_INVENTORY_LEGACY_SYNC_STALE_AFTER_MS = 5 * 60 * 1_000;

export function isSalesInventoryLegacyProjectionActivelySyncing(input: {
	status?: string | null;
	source?: string | null;
	startedAt?: Date | string | null;
	now?: Date;
}) {
	if (input.status !== "syncing" || input.source !== "legacy-status") {
		return false;
	}
	const startedAt = input.startedAt
		? new Date(input.startedAt).getTime()
		: Number.NaN;
	if (!Number.isFinite(startedAt)) return false;
	return (
		(input.now ?? new Date()).getTime() - startedAt <
		SALES_INVENTORY_LEGACY_SYNC_STALE_AFTER_MS
	);
}
