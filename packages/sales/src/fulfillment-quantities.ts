/** Quantities are mutually exclusive scalar or LH/RH, keyed by the sales control UID. */
export type FulfillmentQuantity = { qty: number; lh: number; rh: number };
export type FulfillmentQuantityLine = {
	uid: string;
	salesItemId: number;
	title?: string | null;
	size: string | null;
	ordered: FulfillmentQuantity;
};
export type FulfillmentQuantityDelivery = {
	id: number;
	state: "active" | "completed" | "cancelled";
	/** Null means legacy scope is unknown; physical packing is not a plan. */
	planned: Array<{ uid: string; quantity: FulfillmentQuantity }> | null;
	packed: Array<{ uid: string; quantity: FulfillmentQuantity }>;
	delivered: Array<{ uid: string; quantity: FulfillmentQuantity }>;
};
const axes = ["qty", "lh", "rh"] as const;
const zero = (): FulfillmentQuantity => ({ qty: 0, lh: 0, rh: 0 });
const total = (q: FulfillmentQuantity) => q.qty + q.lh + q.rh;
const add = (a: FulfillmentQuantity, b: FulfillmentQuantity) => {
	for (const axis of axes) a[axis] += b[axis];
};
const remainder = (a: FulfillmentQuantity, b: FulfillmentQuantity) => ({
	qty: Math.max(0, a.qty - b.qty),
	lh: Math.max(0, a.lh - b.lh),
	rh: Math.max(0, a.rh - b.rh),
});
function valid(q: FulfillmentQuantity) {
	return (
		axes.every((axis) => Number.isSafeInteger(q[axis]) && q[axis] >= 0) &&
		!(q.qty > 0 && (q.lh > 0 || q.rh > 0))
	);
}

/** Pure projection shared by overview, backlog and assignment mutation guards. */
export function projectFulfillmentQuantities(input: {
	lines: FulfillmentQuantityLine[];
	deliveries: FulfillmentQuantityDelivery[];
	excludeDeliveryId?: number;
	sourceConflicts?: Array<{ code: string; uid?: string; deliveryId?: number }>;
}) {
	const conflicts: Array<{ code: string; uid?: string; deliveryId?: number }> =
		[...(input.sourceConflicts || [])];
	const rows = new Map(
		input.lines.map((line) => [
			line.uid,
			{
				...line,
				delivered: zero(),
				assigned: zero(),
				packed: zero(),
			},
		]),
	);
	if (rows.size !== input.lines.length)
		conflicts.push({ code: "DUPLICATE_ORDER_LINE" });
	for (const line of input.lines) {
		if (!valid(line.ordered))
			conflicts.push({ code: "INVALID_ORDER_QUANTITY", uid: line.uid });
	}
	const ids = new Set<number>();
	for (const delivery of input.deliveries) {
		if (ids.has(delivery.id)) {
			conflicts.push({
				code: "DUPLICATE_FULFILLMENT",
				deliveryId: delivery.id,
			});
			continue;
		}
		ids.add(delivery.id);
		if (delivery.state === "cancelled") continue;
		const quantities = new Map<
			string,
			{
				planned: FulfillmentQuantity;
				packed: FulfillmentQuantity;
				delivered: FulfillmentQuantity;
			}
		>();
		for (const kind of ["planned", "packed", "delivered"] as const) {
			const seenPlan = new Set<string>();
			for (const line of delivery[kind] || []) {
				const row = rows.get(line.uid);
				if (
					!row ||
					!valid(line.quantity) ||
					(row.ordered.qty > 0
						? line.quantity.lh + line.quantity.rh > 0
						: line.quantity.qty > 0)
				) {
					conflicts.push({
						code: "INVALID_FULFILLMENT_LINE",
						uid: line.uid,
						deliveryId: delivery.id,
					});
					continue;
				}
				if (kind === "planned" && seenPlan.has(line.uid))
					conflicts.push({
						code: "DUPLICATE_PLAN_LINE",
						uid: line.uid,
						deliveryId: delivery.id,
					});
				seenPlan.add(line.uid);
				const q = quantities.get(line.uid) || {
					planned: zero(),
					packed: zero(),
					delivered: zero(),
				};
				add(q[kind], line.quantity);
				quantities.set(line.uid, q);
			}
		}
		if (delivery.state === "active" && delivery.planned === null) {
			conflicts.push({ code: "LEGACY_SCOPE_UNKNOWN", deliveryId: delivery.id });
		}
		for (const [uid, q] of quantities) {
			const row = rows.get(uid)!;
			add(row.delivered, q.delivered);
			add(row.packed, q.packed);
			if (delivery.state === "active") {
				if (
					delivery.planned !== null &&
					axes.some(
						(axis) =>
							Math.max(q.packed[axis], q.delivered[axis]) > q.planned[axis],
					)
				) {
					conflicts.push({
						code: "PHYSICAL_EXCEEDS_PLAN",
						uid,
						deliveryId: delivery.id,
					});
				}
				if (delivery.id !== input.excludeDeliveryId)
					add(row.assigned, remainder(q.planned, q.delivered));
			}
		}
	}
	for (const row of rows.values()) {
		if (
			axes.some(
				(axis) => row.delivered[axis] + row.assigned[axis] > row.ordered[axis],
			)
		) {
			conflicts.push({ code: "OVERALLOCATED", uid: row.uid });
		}
	}
	const lines = [...rows.values()].map((row) => {
		const remainingToDeliver = remainder(row.ordered, row.delivered);
		return {
			...row,
			remainingToDeliver,
			availableToAssign: conflicts.length
				? zero()
				: remainder(remainingToDeliver, row.assigned),
		};
	});
	return {
		lines,
		conflicts,
		resolved: conflicts.length === 0,
		backlogQty: input.deliveries.some(
			(delivery) => delivery.state !== "cancelled",
		)
			? lines.reduce((sum, line) => sum + total(line.availableToAssign), 0)
			: 0,
	};
}
