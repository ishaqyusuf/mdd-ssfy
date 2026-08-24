import { buildGuardedPackingPlan } from "@gnd/sales/dispatch-packing-plan";
import type { DispatchDeliverable, QtyMatrix } from "../types/dispatch.types";

export type PackingLine = {
	salesItemId: number;
	submissionId: number;
	qty: QtyMatrix;
	note?: string;
};

export type BuildPackingPayloadInput = {
	salesItemId: number;
	note?: string;
	enteredQty: QtyMatrix;
	deliverables: DispatchDeliverable[];
};

export type BuildPackingPayloadResult = {
	packingLines: PackingLine[];
	remainder: QtyMatrix;
};

function asNumber(value: number | null | undefined) {
	return Number(value || 0);
}

export function hasQty(qty?: QtyMatrix | null) {
	if (!qty) return false;
	return asNumber(qty.qty) > 0 || asNumber(qty.lh) > 0 || asNumber(qty.rh) > 0;
}

function compactQty(qty: QtyMatrix): QtyMatrix {
	const lh = asNumber(qty.lh);
	const rh = asNumber(qty.rh);
	if (lh > 0 || rh > 0) return { lh, rh };
	return { qty: asNumber(qty.qty) };
}

function explicitQty(qty: QtyMatrix): QtyMatrix {
	const compact = compactQty(qty);
	return {
		qty: asNumber(compact.qty),
		lh: asNumber(compact.lh),
		rh: asNumber(compact.rh),
	};
}

export function buildPackingPayload(
	input: BuildPackingPayloadInput,
): BuildPackingPayloadResult {
	const planned = buildGuardedPackingPlan(
		[
			{
				salesItemId: input.salesItemId,
				itemUid: `sales-item-${input.salesItemId}`,
				title: `Item #${input.salesItemId}`,
				requested: input.enteredQty,
				deliverables: input.deliverables,
				note: input.note,
			},
		],
		[],
	);
	const packingLines = planned.packingLines.map((line) => ({
		salesItemId: line.salesItemId,
		submissionId: line.submissionId,
		qty: compactQty(line.qty),
		note: line.note,
	}));
	const remainder = planned.unavailable[0]?.qty;

	return {
		packingLines,
		remainder: remainder ? explicitQty(remainder) : { qty: 0, lh: 0, rh: 0 },
	};
}
