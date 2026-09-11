import { readFulfillmentAssignmentScope } from "./fulfillment-assignment-scope";

type Matrix = { qty: number; lh: number; rh: number };

/** Consume one shared capacity across submission rows, retaining their identities. */
export function capFulfillmentDeliverables<T extends { qty: Matrix }>(
	rows: T[],
	capacity: Matrix,
) {
	const handed = capacity.lh + capacity.rh > 0;
	const remaining = { ...capacity };
	return rows.flatMap((row) => {
		const lh = handed ? Math.min(Math.max(0, row.qty.lh), remaining.lh) : 0;
		const rh = handed ? Math.min(Math.max(0, row.qty.rh), remaining.rh) : 0;
		const qty = handed
			? lh + rh
			: Math.min(Math.max(0, row.qty.qty), remaining.qty);
		remaining.qty -= qty;
		remaining.lh -= lh;
		remaining.rh -= rh;
		return qty > 0 ? [{ ...row, qty: { ...row.qty, qty, lh, rh } }] : [];
	});
}
type PackingItem = {
	uid: string;
	totalQty: Matrix;
	listedQty: Matrix;
	packedQty: Matrix;
	availableQty: Matrix;
	deliverableQty: Matrix;
};

/** Convert independent persisted axes to the existing packing matrix convention. */
export function scopeFulfillmentPackingTargets<T extends PackingItem>(
	items: T[],
	meta: unknown,
) {
	const parsed = readFulfillmentAssignmentScope(meta);
	if (parsed.state === "legacy") return items;
	if (!parsed.scope)
		throw new Error("Review fulfillment quantities before packing.");
	const plans = new Map(
		parsed.scope.lines.map((line) => [line.uid, line.quantity]),
	);
	const seen = new Set<string>();
	const scoped = items.flatMap((item) => {
		const plan = plans.get(item.uid);
		if (!plan) {
			if (item.listedQty.qty + item.listedQty.lh + item.listedQty.rh > 0)
				throw new Error(
					"Packed items are outside the fulfillment assignment. Review quantities.",
				);
			return [];
		}
		if (seen.has(item.uid))
			throw new Error(
				"Duplicate assigned item in the packing manifest. Review quantities.",
			);
		seen.add(item.uid);
		const handed = plan.lh + plan.rh > 0;
		for (const physical of [item.listedQty, item.packedQty]) {
			if (
				handed
					? physical.lh > plan.lh ||
						physical.rh > plan.rh ||
						physical.qty > plan.lh + plan.rh
					: physical.qty > plan.qty || physical.lh > 0 || physical.rh > 0
			)
				throw new Error(
					"Physical packing exceeds the fulfillment assignment. Review quantities.",
				);
		}
		const matrix = (qty: number, lh: number, rh: number) => ({
			qty: handed ? lh + rh : qty,
			lh,
			rh,
			noHandle: !handed,
		});
		const totalQty = matrix(plan.qty, plan.lh, plan.rh);
		const remaining = (used: Matrix) =>
			matrix(
				Math.max(0, plan.qty - used.qty),
				Math.max(0, plan.lh - used.lh),
				Math.max(0, plan.rh - used.rh),
			);
		const free = remaining(item.listedQty);
		const cap = (value: Matrix) =>
			matrix(
				Math.min(value.qty, free.qty),
				Math.min(value.lh, free.lh),
				Math.min(value.rh, free.rh),
			);
		const availableQty = cap(item.availableQty);
		return [
			{
				...item,
				assignedQty: totalQty,
				totalQty,
				orderedQty: totalQty,
				remainingQty: remaining(item.packedQty),
				availableQty,
				deliverableQty: cap(item.deliverableQty),
				nonDeliverableQty: matrix(
					Math.max(0, free.qty - availableQty.qty),
					Math.max(0, free.lh - availableQty.lh),
					Math.max(0, free.rh - availableQty.rh),
				),
			},
		];
	});
	if (
		parsed.scope.lines.some(
			(line) =>
				!seen.has(line.uid) &&
				line.quantity.qty + line.quantity.lh + line.quantity.rh > 0,
		)
	)
		throw new Error(
			"An assigned item is missing from the packing manifest. Review quantities.",
		);
	return scoped;
}
