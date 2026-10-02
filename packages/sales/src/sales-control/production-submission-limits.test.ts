import { expect, test } from "bun:test";
import { buildProductionSubmissionPlan, productionSubmissionPlanQuantities } from "./actions";

test("worker completion does not create assignments for unassigned order quantities", () => {
	const result = buildProductionSubmissionPlan({
		authorId: 54,
		allowCreateAssignments: false,
		data: {
			order: { id: 1 },
			items: [
				{
					controlUid: "own-door",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 1, lh: 0, rh: 1 } },
						pendingSubmissions: [
							{ assignmentId: 12, qty: { qty: 3, lh: 2, rh: 1 } },
						],
					},
				},
				{
					controlUid: "unassigned-trim",
					itemId: 11,
					analytics: {
						assignment: { pending: { qty: 30, lh: 0, rh: 0 } },
						pendingSubmissions: [],
					},
				},
			],
		} as never,
	});
	expect(result.createAssignments).toHaveLength(0);
	expect(productionSubmissionPlanQuantities(result)).toEqual([
		{ uid: "own-door", assignmentId: 12, qty: 3, lh: 2, rh: 1 },
	]);
});

test("production limits prioritize existing assignments and exclude unrelated items", () => {
  const qty = (qty: number) => ({ qty, lh: 0, rh: 0 });
  const item = (controlUid: string, itemId: number) => ({
    controlUid, itemId,
    analytics: { assignment: { pending: qty(8) }, pendingSubmissions: [{ assignmentId: itemId, qty: qty(2) }] },
  });
  const result = buildProductionSubmissionPlan({
    authorId: 1,
    data: { items: [item("assigned", 1), item("unrelated", 2)] } as never,
    quantityLimits: [{ uid: "assigned", quantity: qty(3) }],
  });
  expect(result.createSubmissions.map(row => row.qty.qty)).toEqual([2]);
  expect(result.createAssignments.map(row => row.qty.qty)).toEqual([1]);
  expect(result.itemScope.every(row => row.controlUid === "assigned")).toBe(true);
});

test("empty explicit production scope cannot become whole-order submission", () => {
  const result = buildProductionSubmissionPlan({
    authorId: 1,
    data: { items: [{ controlUid: "a", itemId: 1, analytics: {
      assignment: { pending: { qty: 8, lh: 0, rh: 0 } }, pendingSubmissions: [],
    } }] } as never,
    quantityLimits: [],
  });
  expect(result.itemScope).toEqual([]);
  expect(result.createAssignments).toEqual([]);
});

 test("production retry evidence includes quantities and ignores plan row order", () => {
   const plan = (qty: number) => ({ createAssignments: [
     { itemInfo: { controlUid: "b" }, qty: { qty, lh: 0, rh: 0 } },
     { itemInfo: { controlUid: "a" }, qty: { qty: 1, lh: 0, rh: 0 } },
   ], createSubmissions: [], itemScope: [] });
   const initial = plan(5);
   expect(productionSubmissionPlanQuantities(initial as never)).not.toEqual(productionSubmissionPlanQuantities(plan(3) as never));
   expect(productionSubmissionPlanQuantities({ ...initial, createAssignments: initial.createAssignments.toReversed() } as never)).toEqual(productionSubmissionPlanQuantities(initial as never));
 });
