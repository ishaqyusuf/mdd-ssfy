import { hasQty } from "@gnd/utils/sales";

import { qtyMatrixSum, recomposeQty } from "./utils/sales-control";

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
	availableWithoutSubmission?: Quantity;
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
	itemUid?: string | null;
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

function quantityTotal(qty: Quantity) {
	const single = Number(qty.qty || 0);
	const left = Number(qty.lh ?? qty.lhQty ?? 0);
	const right = Number(qty.rh ?? qty.rhQty ?? 0);
	return single > 0 ? single : left + right;
}

export function buildPackAllTarget(
	item: {
		totalQty?: Quantity | null;
		availableQty?: Quantity | null;
		deliverableQty?: Quantity | null;
		listedQty?: Quantity | null;
		deliverables?: Array<{ qty?: Quantity | null }> | null;
	},
	singleQuantity: boolean,
) {
	const deliverableQty = recomposeQty(
		qtyMatrixSum(
			...(item.deliverables || []).map((entry) =>
				normalizedQty(entry.qty || {}),
			),
		),
	);
	const listedQty = normalizedQty(item.listedQty || {});
	const fallbackDeliverableQty = normalizedQty(item.deliverableQty || {});
	const availableQty = normalizedQty(item.availableQty || {});
	const sourceQty = hasQty(deliverableQty)
		? deliverableQty
		: hasQty(listedQty)
			? listedQty
			: hasQty(fallbackDeliverableQty)
				? fallbackDeliverableQty
				: availableQty;

	if (singleQuantity) {
		return { qty: Math.max(0, quantityTotal(sourceQty)), lh: 0, rh: 0 };
	}

	return {
		qty: 0,
		lh: Math.max(0, Number(sourceQty.lh || 0)),
		rh: Math.max(0, Number(sourceQty.rh || 0)),
	};
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
		const guardedCandidates = reportableLines.filter(
			(line) =>
				line.salesOrderItemId === item.salesItemId &&
				(!line.itemUid || line.itemUid === item.itemUid),
		);
		const guardedSubmissionIds = new Set(
			guardedCandidates.map((line) => line.productionSubmissionId),
		);

		for (const deliverable of item.deliverables) {
			if (!hasQty(pending)) break;
			// A submission with unresolved upstream evidence must take the guarded
			// review path even though it is already visible as a deliverable.
			if (guardedSubmissionIds.has(deliverable.submissionId)) continue;
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

		// Stock and other non-production lines can have authoritative availability
		// without a production submission id. Their normal requestedItems payload is
		// fulfilled by the sales-control task, so the guarded planner only needs to
		// confirm that the request is within that published capacity.
		if (
			!item.deliverables.length &&
			!guardedCandidates.length &&
			hasQty(pending) &&
			hasQty(item.availableWithoutSubmission)
		) {
			pending = recomposeQty(
				takeAvailableQuantity(pending, item.availableWithoutSubmission || {})
					.pendingPick,
			);
		}

		for (const line of guardedCandidates) {
			if (!hasQty(pending)) break;
			const picked = takeAvailableQuantity(pending, line.remaining);
			if (hasQty(picked.picked)) {
				const pickedQty = normalizedQty(picked.picked);
				const lhQty = Number(pickedQty.lh || 0);
				const rhQty = Number(pickedQty.rh || 0);
				guardedLines.push({
					productionSubmissionId: line.productionSubmissionId,
					salesOrderItemId: line.salesOrderItemId,
					dispatchAllocationKey: line.dispatchAllocationKey,
					title: item.title || line.title,
					qty: lhQty > 0 || rhQty > 0 ? 0 : Number(pickedQty.qty || 0),
					lhQty,
					rhQty,
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
