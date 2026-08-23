import { describe, expect, it } from "bun:test";

import { buildGuardedPackingPlan } from "./guarded-packing-plan";

describe("guarded packing submit plan", () => {
	it("keeps fully available quantity in canonical packing", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "item-10",
					title: "Door",
					requested: { qty: 2 },
					deliverables: [{ submissionId: 100, qty: { qty: 2 } }],
				},
			],
			[],
		);

		expect(plan.packingLines.length).toBe(1);
		expect(plan.guardedLines.length).toBe(0);
		expect(plan.unavailable.length).toBe(0);
	});

	it("moves only the unavailable eligible quantity into guarded packing", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "item-10",
					title: "Door",
					requested: { qty: 5 },
					deliverables: [{ submissionId: 100, qty: { qty: 3 } }],
				},
			],
			[
				{
					productionSubmissionId: 101,
					salesOrderItemId: 10,
					dispatchAllocationKey: "dispatch:1:allocation:2",
					title: "Door",
					remaining: { qty: 2 },
				},
			],
		);

		expect(plan.packingLines[0]?.qty.qty).toBe(3);
		expect(plan.guardedLines[0]?.productionSubmissionId).toBe(101);
		expect(plan.guardedLines[0]?.qty).toBe(2);
		expect(plan.unavailable.length).toBe(0);
	});

	it("rejects quantity beyond both canonical and guarded availability", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "item-10",
					title: "Door",
					requested: { lh: 3, rh: 2 },
					deliverables: [{ submissionId: 100, qty: { lh: 1, rh: 1 } }],
				},
			],
			[
				{
					productionSubmissionId: 101,
					salesOrderItemId: 10,
					dispatchAllocationKey: "dispatch:1:allocation:2",
					title: "Door",
					remaining: { lhQty: 1, rhQty: 1 },
				},
			],
		);

		expect(plan.unavailable[0]?.qty.lh).toBe(1);
		expect(plan.unavailable[0]?.qty.rh).toBe(0);
	});
});
