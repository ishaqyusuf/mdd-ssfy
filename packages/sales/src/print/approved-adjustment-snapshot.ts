import { projectApprovedAdjustmentLegacyOrder } from "../sales-form/application/approved-adjustment-projection";
import type { PrintSalesData } from "./query";

/**
 * Applied adjustments own both retained door rows and their parent commercial
 * values. Reuse the compatibility projection so print reconciliation never
 * compares approved doors against stale legacy quantities or totals.
 */
export function applyApprovedAdjustmentPrintSnapshot(
	sale: PrintSalesData,
): PrintSalesData {
	const { order, adjustmentSnapshotAuthority } =
		projectApprovedAdjustmentLegacyOrder(sale);
	if (!adjustmentSnapshotAuthority) return sale;

	// Keep persisted invoice balances and footer totals on their existing source.
	return { ...sale, items: order.items };
}
