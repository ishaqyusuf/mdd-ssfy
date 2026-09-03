import type { TransactionClient } from "@gnd/db";
import { roundMoney } from "@gnd/sales/payment-system";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

type ApprovedAdjustmentLineReference = {
	lineUid: string;
	salesOrderItemId: number | null;
	proposedQty: unknown;
};

export function getApprovedRemovedSalesLines(input: {
	lines: ApprovedAdjustmentLineReference[];
	proposedLineUids: Set<string>;
}) {
	return input.lines.flatMap((line) => {
		const salesOrderItemId = Number(line.salesOrderItemId || 0);
		if (!Number.isInteger(salesOrderItemId) || salesOrderItemId <= 0) {
			throw new Error(
				`Adjustment line ${line.lineUid} is not linked to a persisted sale item.`,
			);
		}
		if (input.proposedLineUids.has(line.lineUid)) return [];
		if (Number(line.proposedQty) !== 0) {
			throw new Error(
				`Adjustment line ${line.lineUid} is missing from its approved proposal.`,
			);
		}
		return [{ lineUid: line.lineUid, salesOrderItemId }];
	});
}

export async function retireApprovedSalesOrderLine(input: {
	tx: TransactionClient;
	salesOrderId: number;
	salesOrderItemId: number;
	lineUid: string;
}) {
	const salesItems = await input.tx.salesOrderItems.findMany({
		where: {
			salesOrderId: input.salesOrderId,
			deletedAt: null,
			OR: [
				{ id: input.salesOrderItemId },
				{ multiDykeUid: input.lineUid },
			],
		},
		select: { id: true },
	});
	const salesOrderItemIds = salesItems.map((item) => item.id);
	if (!salesOrderItemIds.length) return;

	const retiredAt = new Date();
	await input.tx.dykeSalesDoors.updateMany({
		where: {
			salesOrderId: input.salesOrderId,
			deletedAt: null,
			salesOrderItemId: { in: salesOrderItemIds },
		},
		data: { deletedAt: retiredAt, activeIdentity: null },
	});
	await input.tx.dykeStepForm.updateMany({
		where: {
			salesId: input.salesOrderId,
			deletedAt: null,
			salesItemId: { in: salesOrderItemIds },
		},
		data: { deletedAt: retiredAt },
	});
	await input.tx.dykeSalesShelfItem.updateMany({
		where: {
			deletedAt: null,
			salesOrderItemId: { in: salesOrderItemIds },
		},
		data: { deletedAt: retiredAt },
	});
	await input.tx.housePackageTools.updateMany({
		where: {
			salesOrderId: input.salesOrderId,
			deletedAt: null,
			orderItemId: { in: salesOrderItemIds },
		},
		data: { deletedAt: retiredAt },
	});
	await input.tx.salesOrderItems.updateMany({
		where: {
			salesOrderId: input.salesOrderId,
			deletedAt: null,
			id: { in: salesOrderItemIds },
		},
		data: { deletedAt: retiredAt },
	});
}

export async function projectApprovedShelfSalesLine(input: {
	tx: TransactionClient;
	salesOrderItemId: number;
	line: Record<string, unknown>;
}) {
	if (!Array.isArray(input.line.shelfItems)) return false;

	const existing = await input.tx.dykeSalesShelfItem.findMany({
		where: { salesOrderItemId: input.salesOrderItemId, deletedAt: null },
		select: { id: true, categoryId: true, productId: true },
	});
	const existingIds = new Set(existing.map((row) => row.id));
	const existingByProduct = new Map<string, number[]>();
	for (const row of existing) {
		const key = `${row.categoryId}:${row.productId ?? "none"}`;
		existingByProduct.set(key, [...(existingByProduct.get(key) || []), row.id]);
	}
	const retainedIds: number[] = [];
	const retainedIdSet = new Set<number>();

	for (const value of input.line.shelfItems) {
		const shelf = record(value);
		const categoryId = Number(shelf.categoryId || 0);
		if (!categoryId) continue;
		const productId = Number(shelf.productId || 0) || null;
		const requestedId = Number(shelf.id || 0);
		const productKey = `${categoryId}:${productId ?? "none"}`;
		const existingId =
			existingIds.has(requestedId) && !retainedIdSet.has(requestedId)
				? requestedId
				: Number(
						(existingByProduct.get(productKey) || []).find(
							(id) => !retainedIdSet.has(id),
						) || 0,
					);
		const data = {
			salesOrderItemId: input.salesOrderItemId,
			categoryId,
			productId,
			description:
				typeof shelf.description === "string" ? shelf.description : null,
			qty: Math.round(Number(shelf.qty || 0)),
			unitPrice: roundMoney(Number(shelf.unitPrice || 0)),
			totalPrice: roundMoney(Number(shelf.totalPrice || 0)),
			meta: record(shelf.meta),
			deletedAt: null,
		};
		if (existingId > 0) {
			await input.tx.dykeSalesShelfItem.update({
				where: { id: existingId },
				data,
			});
			retainedIds.push(existingId);
			retainedIdSet.add(existingId);
			continue;
		}
		const created = await input.tx.dykeSalesShelfItem.create({
			data,
			select: { id: true },
		});
		retainedIds.push(created.id);
		retainedIdSet.add(created.id);
	}

	await input.tx.dykeSalesShelfItem.updateMany({
		where: {
			salesOrderItemId: input.salesOrderItemId,
			deletedAt: null,
			id: { notIn: retainedIds.length ? retainedIds : [0] },
		},
		data: { deletedAt: new Date() },
	});
	return true;
}

export async function projectApprovedSalesTaxes(input: {
	tx: TransactionClient;
	salesOrderId: number;
	proposal: Record<string, unknown>;
	summary: Record<string, unknown>;
}) {
	await input.tx.salesTaxes.deleteMany({
		where: { salesId: input.salesOrderId },
	});
	const taxCode = String(record(input.proposal.meta).taxCode || "").trim();
	if (!taxCode) return;
	await input.tx.salesTaxes.create({
		data: {
			salesId: input.salesOrderId,
			taxCode,
			taxxable: roundMoney(Number(input.summary.taxableSubTotal || 0)),
			tax: roundMoney(Number(input.summary.taxTotal || 0)),
		},
	});
}
