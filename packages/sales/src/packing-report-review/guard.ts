import type { Db, TransactionClient } from "@gnd/db";
import { PackingReportError } from "./policy";

export async function assertNoPendingPackingReports(
	db: Db | TransactionClient,
	input: { dispatchId: number; salesOrderId: number },
) {
	const pending = await db.salesPackingReport.count({
		where: {
			orderDeliveryId: input.dispatchId,
			salesOrderId: input.salesOrderId,
			status: "PENDING",
		},
	});
	if (pending > 0) {
		throw new PackingReportError(
			"NOT_REPORTABLE",
			"Dispatch is awaiting packing report review and cannot start, load, or complete.",
		);
	}
}

/** Serialize every packing/report lifecycle write for one dispatch. */
export async function lockPackingDispatchScope(
	db: Db | TransactionClient,
	dispatchId: number,
) {
	await db.$queryRaw`SELECT id FROM OrderDelivery WHERE id = ${dispatchId} FOR UPDATE`;
}

export async function lockAndAssertNoPendingPackingReports(
	db: Db | TransactionClient,
	input: { dispatchId: number; salesOrderId: number },
) {
	await lockPackingDispatchScope(db, input.dispatchId);
	await assertNoPendingPackingReports(db, input);
}
