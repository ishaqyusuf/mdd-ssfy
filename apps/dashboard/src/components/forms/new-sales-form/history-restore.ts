import { clearSalesFormLineItemPersistenceIds } from "@gnd/sales/sales-form";
import type { NewSalesFormRecord } from "./schema";

export function createSalesHistoryRestoreRecord(
	current: NewSalesFormRecord,
	snapshot: NewSalesFormRecord,
): NewSalesFormRecord {
	return {
		...snapshot,
		salesId: current.salesId,
		slug: current.slug,
		orderId: current.orderId,
		type: current.type,
		status: current.status,
		inventoryStatus: current.inventoryStatus,
		version: current.version,
		updatedAt: current.updatedAt,
		settings: current.settings,
		paymentTotal: current.paymentTotal,
		paymentCount: current.paymentCount,
		paymentMethodReviewDismissed: current.paymentMethodReviewDismissed,
		lineItems: snapshot.lineItems.map(clearSalesFormLineItemPersistenceIds),
		extraCosts: snapshot.extraCosts.map((cost) => ({
			...cost,
			id: null,
		})),
	};
}
