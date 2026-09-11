import { expect, test } from "bun:test";
import { fulfillmentProductionLimits } from "./fulfillment-production-limits";

test("only outstanding assigned demand needs production", () => {
  expect(fulfillmentProductionLimits({
    planned: [{ uid: "a", quantity: { qty: 5, lh: 0, rh: 0 } }],
    packed: [{ uid: "a", packed: { qty: 2, lh: 0, rh: 0 } }],
    items: [{ controlUid: "a", deliverables: [{ qty: { qty: 1 } }] }, { controlUid: "other" }],
  })).toEqual([{ uid: "a", quantity: { qty: 2, lh: 0, rh: 0 } }]);
});

test("LH surplus cannot satisfy RH production demand", () => {
  expect(fulfillmentProductionLimits({
    planned: [{ uid: "a", quantity: { qty: 0, lh: 3, rh: 2 } }],
    packed: [{ uid: "a", packed: { qty: 0, lh: 1, rh: 0 } }],
    items: [{ controlUid: "a", deliverables: [{ qty: { qty: 9, lh: 8, rh: 1 } }] }],
  })).toEqual([{ uid: "a", quantity: { qty: 1, lh: 0, rh: 1 } }]);
});

test("negative deliverables cannot create extra production demand", () => {
  expect(() => fulfillmentProductionLimits({
    planned: [{ uid: "a", quantity: { qty: 5, lh: 0, rh: 0 } }], packed: [],
    items: [{ controlUid: "a", deliverables: [{ qty: { qty: -1 } }] }],
  })).toThrow("Review deliverable quantities");
});
