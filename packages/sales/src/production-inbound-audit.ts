import type { Prisma, TransactionClient } from "@gnd/db";
import { AppError } from "@gnd/errors";

export type ProductionReceiptAuditScope = {
	salesOrderId: number;
	inboundId: number;
	componentIds: number[];
	variantIds: number[];
};

const limit = 501;

/** Capture inside the receipt transaction, before and after the command's effects. */
export async function captureProductionReceiptState(
	tx: TransactionClient,
	scope: ProductionReceiptAuditScope,
) {
	// An explicit deletedAt key opts out of the shared default soft-delete filter.
	// Preserve deleted rows so revivals are distinguishable from newly created rows.
	const [
		order,
		shipment,
		items,
		components,
		demands,
		allocations,
		stocks,
		movements,
		reviews,
		assignments,
		submissions,
		payroll,
		payments,
		completions,
		stockCommitments,
		dispatches,
		packingReports,
	] = await Promise.all([
		tx.salesOrders.findUniqueOrThrow({
			where: { id: scope.salesOrderId },
			select: {
				id: true,
				status: true,
				inventoryStatus: true,
				deletedAt: true,
				updatedAt: true,
			},
		}),
		tx.inboundShipment.findUniqueOrThrow({ where: { id: scope.inboundId } }),
		tx.inboundShipmentItem.findMany({
			where: { inboundId: scope.inboundId, deletedAt: undefined },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.lineItemComponents.findMany({
			where: { id: { in: scope.componentIds } },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.inboundDemand.findMany({
			where: {
				lineItemComponentId: { in: scope.componentIds },
				deletedAt: undefined,
			},
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.stockAllocation.findMany({
			where: {
				lineItemComponentId: { in: scope.componentIds },
				deletedAt: undefined,
			},
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.inventoryStock.findMany({
			where: {
				inventoryVariantId: { in: scope.variantIds },
				deletedAt: undefined,
			},
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.stockMovement.findMany({
			where: {
				inboundStockItem: { inboundId: scope.inboundId },
				deletedAt: undefined,
			},
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.salesProductionSubmissionMaterialReview.findMany({
			where: { salesOrderId: scope.salesOrderId },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.orderItemProductionAssignments.findMany({
			where: { orderId: scope.salesOrderId, deletedAt: undefined },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.orderProductionSubmissions.findMany({
			where: { salesOrderId: scope.salesOrderId, deletedAt: undefined },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.payroll.findMany({
			where: { orderId: scope.salesOrderId, deletedAt: undefined },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.salesPayments.findMany({
			where: { orderId: scope.salesOrderId, deletedAt: undefined },
			orderBy: { id: "asc" },
			take: limit,
			select: {
				id: true,
				orderId: true,
				amount: true,
				status: true,
				deletedAt: true,
				updatedAt: true,
				reviewStatus: true,
				reviewedAt: true,
				reviewedById: true,
				reviewMethod: true,
				reviewedByAction: true,
				reviewNote: true,
			},
		}),
		tx.salesCompletionRecord.findMany({
			where: { salesOrderId: scope.salesOrderId },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.stockAllocation.findMany({
			where: {
				inventoryVariantId: { in: scope.variantIds },
				lineItemComponentId: { notIn: scope.componentIds },
				deletedAt: null,
			},
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.orderDelivery.findMany({
			where: { salesOrderId: scope.salesOrderId, deletedAt: undefined },
			orderBy: { id: "asc" },
			take: limit,
		}),
		tx.salesPackingReport.findMany({
			where: { salesOrderId: scope.salesOrderId },
			orderBy: { id: "asc" },
			take: limit,
		}),
	]);
	const rows = {
		items,
		components,
		demands,
		allocations,
		stocks,
		movements,
		reviews,
		assignments,
		submissions,
		payroll,
		payments,
		completions,
		stockCommitments,
		dispatches,
		packingReports,
	};
	if (Object.values(rows).some((records) => records.length >= limit))
		throw new AppError({
			code: "CONFLICT",
			publicMessage:
				"Open Inventory to receive this larger order. Its receipt history exceeds the Production limit.",
		});
	return { order, shipment, ...rows };
}

export type ProductionReceiptState = Awaited<
	ReturnType<typeof captureProductionReceiptState>
>;

/** MySQL JSON may reorder object keys; array/row order remains significant. */
export function receiptEvidenceFingerprint(value: unknown): string {
	const sort = (input: unknown): unknown => {
		if (input instanceof Date) return input.toISOString();
		if (Array.isArray(input)) return input.map(sort);
		if (input && typeof input === "object")
			return Object.fromEntries(
				Object.entries(input)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, val]) => [key, sort(val)]),
			);
		return input;
	};
	return JSON.stringify(sort(value));
}

export function changedReceiptRows<T extends { id: number | string }>(
	before: T[],
	after: T[],
) {
	const original = new Map(before.map((row) => [row.id, row]));
	return after.flatMap((row) => {
		const prior = original.get(row.id);
		return receiptEvidenceFingerprint(prior) === receiptEvidenceFingerprint(row)
			? []
			: [{ before: prior, after: row }];
	});
}

export function productionReceiptAuditJson(
	value: unknown,
): Prisma.InputJsonObject {
	const serialized = JSON.stringify(value);
	if (Buffer.byteLength(serialized, "utf8") > 1_000_000)
		throw new AppError({
			code: "CONFLICT",
			publicMessage:
				"Open Inventory to receive this order. Its receipt history is too large for Production.",
		});
	return JSON.parse(serialized) as Prisma.InputJsonObject;
}
