import type { Db, TransactionClient } from "@gnd/db";
import { lockAndAssertNoPendingPackingReports } from "@gnd/sales/packing-report-review";

const PACKING_REPORT_HELD_STATUSES = new Set([
	"packing",
	"packing queue",
	"packed",
	"in progress",
	"completed",
	"delivered",
]);

export async function assertDispatchStatusPackingAllowed(
	db: Db | TransactionClient,
	input: {
		dispatchId: number;
		salesOrderId: number;
		newStatus: string;
	},
) {
	if (!PACKING_REPORT_HELD_STATUSES.has(input.newStatus)) return;
	await lockAndAssertNoPendingPackingReports(db, input);
}

export async function assertDispatchDeletionPackingAllowed(
	db: Db | TransactionClient,
	input: { dispatchIds: number[]; salesOrderId: number },
) {
	const dispatchIds = [...new Set(input.dispatchIds)].sort((a, b) => a - b);
	for (const dispatchId of dispatchIds) {
		await lockAndAssertNoPendingPackingReports(db, {
			dispatchId,
			salesOrderId: input.salesOrderId,
		});
	}
}
