import { expect, test } from "bun:test";
import { buildProductionSubmissionPlan, productionSubmissionPlanQuantities } from "./actions";

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
