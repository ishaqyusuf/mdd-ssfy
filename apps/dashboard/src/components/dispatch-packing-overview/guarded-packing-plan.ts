import { hasQty } from "@gnd/utils/sales";
import { recomposeQty } from "@sales/utils/sales-control";

type Quantity = {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
};

export type PackingPlanItem = {
	salesItemId: number;
	itemUid: string;
	title: string;
	requested: Quantity;
	deliverables: Array<{
		submissionId: number;
		qty: Quantity;
	}>;
	note?: string;
};

export type GuardedPackingLine = {
	productionSubmissionId: number;
	salesOrderItemId: number;
	dispatchAllocationKey: string;
	title: string;
	qty: number;
	lhQty: number;
	rhQty: number;
	note?: string;
};

export type GuardedPackingReportableLine = {
	productionSubmissionId: number;
	salesOrderItemId: number;
	dispatchAllocationKey: string;
	title: string;
	remaining: Quantity;
};

function normalizedQty(value: Quantity) {
	return recomposeQty({
		qty: Math.max(0, Number(value.qty || 0)),
		lh: Math.max(0, Number(value.lh ?? value.lhQty ?? 0)),
		rh: Math.max(0, Number(value.rh ?? value.rhQty ?? 0)),
	});
}

function takeAvailableQuantity(requested: Quantity, available: Quantity) {
	const pending = normalizedQty(requested);
	const capacity = normalizedQty(available);
	const handled = Number(pending.lh || 0) > 0 || Number(pending.rh || 0) > 0;
	const picked = handled
		? normalizedQty({
				lh: Math.min(Number(pending.lh || 0), Number(capacity.lh || 0)),
				rh: Math.min(Number(pending.rh || 0), Number(capacity.rh || 0)),
			})
		: normalizedQty({
				qty: Math.min(Number(pending.qty || 0), Number(capacity.qty || 0)),
			});
	const pendingPick = handled
		? normalizedQty({
				lh: Number(pending.lh || 0) - Number(picked.lh || 0),
				rh: Number(pending.rh || 0) - Number(picked.rh || 0),
			})
		: normalizedQty({
				qty: Number(pending.qty || 0) - Number(picked.qty || 0),
			});

	return { picked, pendingPick };
}

export function buildGuardedPackingPlan(
	items: PackingPlanItem[],
	reportableLines: GuardedPackingReportableLine[],
) {
	const packingLines: Array<{
		salesItemId: number;
		submissionId: number;
		qty: ReturnType<typeof recomposeQty>;
		note?: string;
	}> = [];
	const guardedLines: GuardedPackingLine[] = [];
	const unavailable: Array<{
		salesItemId: number;
		title: string;
		qty: ReturnType<typeof recomposeQty>;
	}> = [];

	for (const item of items) {
		let pending = normalizedQty(item.requested);
		if (!hasQty(pending)) continue;

		for (const deliverable of item.deliverables) {
			if (!hasQty(pending)) break;
			const picked = takeAvailableQuantity(pending, deliverable.qty);
			if (hasQty(picked.picked)) {
				packingLines.push({
					salesItemId: item.salesItemId,
					submissionId: deliverable.submissionId,
					qty: recomposeQty(picked.picked),
					note: item.note,
				});
			}
			pending = recomposeQty(picked.pendingPick);
		}

		const guardedCandidates = reportableLines.filter(
			(line) => line.salesOrderItemId === item.salesItemId,
		);
		for (const line of guardedCandidates) {
			if (!hasQty(pending)) break;
			const picked = takeAvailableQuantity(pending, line.remaining);
			if (hasQty(picked.picked)) {
				const pickedQty = normalizedQty(picked.picked);
				guardedLines.push({
					productionSubmissionId: line.productionSubmissionId,
					salesOrderItemId: line.salesOrderItemId,
					dispatchAllocationKey: line.dispatchAllocationKey,
					title: item.title || line.title,
					qty: Number(pickedQty.qty || 0),
					lhQty: Number(pickedQty.lh || 0),
					rhQty: Number(pickedQty.rh || 0),
					note: item.note,
				});
			}
			pending = recomposeQty(picked.pendingPick);
		}

		if (hasQty(pending)) {
			unavailable.push({
				salesItemId: item.salesItemId,
				title: item.title,
				qty: recomposeQty(pending),
			});
		}
	}

	return { packingLines, guardedLines, unavailable };
}
