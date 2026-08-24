import type { RecognizedSalesInventoryLegacyStatus } from "./sales-inventory-legacy-compatibility";

export function getSalesInventoryLegacyMigrationIdempotencyKey(input: {
	salesOrderId: number;
	legacyStatus: RecognizedSalesInventoryLegacyStatus;
	savedOrderUpdatedAt: string;
}) {
	return [
		"sales-inventory-legacy",
		input.salesOrderId,
		input.legacyStatus,
		input.savedOrderUpdatedAt,
	].join(":");
}
