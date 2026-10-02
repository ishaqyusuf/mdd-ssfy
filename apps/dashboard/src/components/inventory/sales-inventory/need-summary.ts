import type { RouterOutputs } from "@api/trpc/routers/_app";
type Plan = RouterOutputs["inventories"]["salesFormStockPlan"];
export function summarizeInventoryNeed(rows: Plan["rows"]) {
	return rows.reduce(
		(total, row) => ({
			required: total.required + row.required,
			applied: total.applied + row.applied,
			remaining: total.remaining + Math.max(0, row.required - row.applied),
			onWay: total.onWay + row.protectedInbound,
			apply: total.apply + row.applyQty,
			shortage: total.shortage + row.shortage,
		}),
		{ required: 0, applied: 0, remaining: 0, onWay: 0, apply: 0, shortage: 0 },
	);
}
