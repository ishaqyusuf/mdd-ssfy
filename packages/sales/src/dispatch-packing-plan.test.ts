import { describe, expect, it } from "bun:test";

import {
	buildGuardedPackingPlan,
	buildPackAllTarget,
} from "./dispatch-packing-plan";

describe("dispatch packing plan", () => {
	it("keeps Pack All at zero when ordered production is unavailable", () => {
		expect(
			buildPackAllTarget(
				{
					totalQty: { qty: 1 },
					availableQty: { qty: 0 },
					deliverableQty: { qty: 0 },
					deliverables: [],
				},
				true,
			),
		).toEqual({ qty: 0, lh: 0, rh: 0 });
	});

	it("uses available quantity when canonical deliverables are absent", () => {
		expect(
			buildPackAllTarget(
				{
					totalQty: { qty: 35 },
					availableQty: { qty: 35 },
					deliverables: [],
				},
				true,
			),
		).toEqual({ qty: 35, lh: 0, rh: 0 });
	});

	it("caps Pack All at partial availability instead of ordered quantity", () => {
		expect(
			buildPackAllTarget(
				{
					totalQty: { qty: 12 },
					availableQty: { qty: 5 },
					deliverables: [],
				},
				true,
			),
		).toEqual({ qty: 5, lh: 0, rh: 0 });
	});

	it("preserves handed availability without converting it to scalar quantity", () => {
		expect(
			buildPackAllTarget(
				{
					totalQty: { lh: 4, rh: 3 },
					availableQty: { lh: 2, rh: 1 },
					deliverables: [],
				},
				false,
			),
		).toEqual({ qty: 0, lh: 2, rh: 1 });
	});

	it("uses listed quantity when editing existing packing", () => {
		expect(
			buildPackAllTarget(
				{
					totalQty: { qty: 10 },
					availableQty: { qty: 0 },
					listedQty: { qty: 6 },
					deliverables: [],
				},
				true,
			),
		).toEqual({ qty: 6, lh: 0, rh: 0 });
	});

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

	it("routes a deliverable with unresolved upstream evidence through guarded review", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "door-10",
					title: "Door",
					requested: { qty: 2 },
					deliverables: [{ submissionId: 100, qty: { qty: 2 } }],
				},
			],
			[
				{
					productionSubmissionId: 100,
					salesOrderItemId: 10,
					itemUid: "door-10",
					dispatchAllocationKey: "allocation-100",
					title: "Door",
					remaining: { qty: 2 },
				},
			],
		);

		expect(plan.packingLines).toHaveLength(0);
		expect(plan.guardedLines).toEqual([
			expect.objectContaining({
				productionSubmissionId: 100,
				qty: 2,
			}),
		]);
		expect(plan.unavailable).toHaveLength(0);
	});

	it("keeps handed guarded quantities canonical instead of duplicating total qty", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "door-10",
					title: "Door",
					requested: { lh: 1 },
					deliverables: [{ submissionId: 100, qty: { lh: 1 } }],
				},
			],
			[
				{
					productionSubmissionId: 100,
					salesOrderItemId: 10,
					itemUid: "door-10",
					dispatchAllocationKey: "allocation-100",
					title: "Door",
					remaining: { lhQty: 1 },
				},
			],
		);

		expect(plan.guardedLines[0]).toMatchObject({
			qty: 0,
			lhQty: 1,
			rhQty: 0,
		});
	});

	it("does not route another control on the same sales item through guarded review", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "door-11",
					title: "Other door",
					requested: { qty: 1 },
					deliverables: [{ submissionId: 101, qty: { qty: 1 } }],
				},
			],
			[
				{
					productionSubmissionId: 100,
					salesOrderItemId: 10,
					itemUid: "door-10",
					dispatchAllocationKey: "allocation-100",
					title: "Door",
					remaining: { qty: 1 },
				},
			],
		);

		expect(plan.packingLines).toHaveLength(1);
		expect(plan.guardedLines).toHaveLength(0);
	});

	it("accepts published stock availability without a production submission", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 20,
					itemUid: "stock-20",
					title: "Moulding",
					requested: { qty: 35 },
					availableWithoutSubmission: { qty: 35 },
					deliverables: [],
				},
			],
			[],
		);

		expect(plan.packingLines).toHaveLength(0);
		expect(plan.guardedLines).toHaveLength(0);
		expect(plan.unavailable).toHaveLength(0);
	});

	it("does not let stock fallback bypass a guarded upstream review", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 20,
					itemUid: "stock-20",
					title: "Moulding",
					requested: { qty: 1 },
					availableWithoutSubmission: { qty: 1 },
					deliverables: [],
				},
			],
			[
				{
					productionSubmissionId: 200,
					salesOrderItemId: 20,
					itemUid: "stock-20",
					dispatchAllocationKey: "allocation-200",
					title: "Moulding",
					remaining: { qty: 1 },
				},
			],
		);

		expect(plan.guardedLines).toHaveLength(1);
		expect(plan.unavailable).toHaveLength(0);
	});

	it("rejects stock quantity beyond published availability", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 20,
					itemUid: "stock-20",
					title: "Moulding",
					requested: { qty: 36 },
					availableWithoutSubmission: { qty: 35 },
					deliverables: [],
				},
			],
			[],
		);

		expect(plan.unavailable[0]?.qty.qty).toBe(1);
	});

	it("moves only unavailable eligible quantity into guarded packing", () => {
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

	it("splits handed packing across multiple canonical submissions", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "item-10",
					title: "Pre-hung door",
					requested: { lh: 3, rh: 2 },
					deliverables: [
						{ submissionId: 100, qty: { lh: 1, rh: 1 } },
						{ submissionId: 101, qty: { lh: 2, rh: 1 } },
					],
				},
			],
			[],
		);

		expect(plan.packingLines.map((line) => line.qty)).toEqual([
			{ qty: 2, lh: 1, rh: 1, noHandle: false },
			{ qty: 3, lh: 2, rh: 1, noHandle: false },
		]);
		expect(plan.unavailable).toHaveLength(0);
	});

	it("ignores zero-entry lines instead of creating empty packing records", () => {
		const plan = buildGuardedPackingPlan(
			[
				{
					salesItemId: 10,
					itemUid: "item-10",
					title: "Door",
					requested: { qty: 0, lh: 0, rh: 0 },
					deliverables: [{ submissionId: 100, qty: { qty: 5 } }],
				},
			],
			[],
		);

		expect(plan).toEqual({
			packingLines: [],
			guardedLines: [],
			unavailable: [],
		});
	});

	it("rejects quantity beyond canonical and guarded availability", () => {
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
