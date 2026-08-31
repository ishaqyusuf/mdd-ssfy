import type { Db, TransactionClient } from "@gnd/db";
import {
	getGuardedPackingSettings,
	guardedPackingReviewBlocksDelivery,
} from "@gnd/settings";
import { PackingReportError } from "./policy";

type PendingPackingReportGuardOptions = {
	allowDeliveryWhilePending?: boolean;
};

export async function pendingPackingReviewAllowsDelivery(
	db: Db | TransactionClient,
	input: { dispatchId: number; salesOrderId: number },
) {
	const pending = await db.salesPackingReport.findMany({
		where: {
			orderDeliveryId: input.dispatchId,
			salesOrderId: input.salesOrderId,
			status: "PENDING",
		},
		select: { evidenceSnapshot: true },
	});
	if (!pending.length) return false;
	const settingsModel = (
		db as unknown as { settings?: { findFirst?: unknown } }
	).settings;
	const effectivePolicy =
		typeof settingsModel?.findFirst === "function"
			? await getGuardedPackingSettings(db as Db)
			: undefined;
	return pending.every(
		(report) =>
			!guardedPackingReviewBlocksDelivery(
				report.evidenceSnapshot,
				effectivePolicy,
			),
	);
}

export async function assertNoPendingPackingReports(
	db: Db | TransactionClient,
	input: { dispatchId: number; salesOrderId: number },
	options: PendingPackingReportGuardOptions = {},
) {
	const model = db.salesPackingReport as typeof db.salesPackingReport;
	const query = {
		where: {
			orderDeliveryId: input.dispatchId,
			salesOrderId: input.salesOrderId,
			status: "PENDING" as const,
		},
	};
	const pending =
		typeof model.findMany === "function"
			? await model.findMany({
					...query,
					select: { evidenceSnapshot: true },
				})
			: Array.from(
					{
						length: await (
							model as unknown as {
								count: (args: typeof query) => Promise<number>;
							}
						).count(query),
					},
					() => ({ evidenceSnapshot: null }),
				);
	const settingsModel = (
		db as unknown as { settings?: { findFirst?: unknown } }
	).settings;
	const effectivePolicy =
		options.allowDeliveryWhilePending &&
		typeof settingsModel?.findFirst === "function"
			? await getGuardedPackingSettings(db as Db)
			: undefined;
	const blocking = options.allowDeliveryWhilePending
		? pending.filter((report) =>
				guardedPackingReviewBlocksDelivery(
					report.evidenceSnapshot,
					effectivePolicy,
				),
			)
		: pending;
	if (blocking.length > 0) {
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
	options: PendingPackingReportGuardOptions = {},
) {
	await lockPackingDispatchScope(db, input.dispatchId);
	await assertNoPendingPackingReports(db, input, options);
}
