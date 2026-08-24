import { normalizeSalesInventoryLegacyStatus } from "@gnd/sales/sales-inventory-legacy-compatibility";

type LegacyInventoryPostSaveInput = {
	salesId?: number | null;
	orderNo?: string | null;
	salesType?: string | null;
	inventoryStatus?: string | null;
	savedOrderUpdatedAt?: string | null;
	afterSuccessfulSave: boolean;
	skipOrdinaryConfigurator?: boolean;
};

export type LegacyInventoryPostSaveAction =
	| { action: "none" }
	| { action: "configure_inventory"; salesOrderId: number }
	| {
			action: "queue_legacy_adaptation";
			salesOrderId: number;
			orderNo: string;
			legacyStatus: "AVAILABLE" | "ORDERED" | "PENDING ORDER";
			savedOrderUpdatedAt: string;
	  };

export function resolveLegacyInventoryPostSaveAction(
	input: LegacyInventoryPostSaveInput,
): LegacyInventoryPostSaveAction {
	const salesOrderId = Number(input.salesId || 0);
	if (input.salesType !== "order" || !salesOrderId) return { action: "none" };

	const legacyStatus = normalizeSalesInventoryLegacyStatus(
		input.inventoryStatus,
	);
	if (legacyStatus) {
		if (!input.afterSuccessfulSave) return { action: "none" };
		if (!input.orderNo || !input.savedOrderUpdatedAt) return { action: "none" };
		return {
			action: "queue_legacy_adaptation",
			salesOrderId,
			orderNo: input.orderNo,
			legacyStatus,
			savedOrderUpdatedAt: input.savedOrderUpdatedAt,
		};
	}
	if (input.skipOrdinaryConfigurator) return { action: "none" };

	return { action: "configure_inventory", salesOrderId };
}
