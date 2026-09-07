import { expect, it } from "bun:test";
import { assertProductionAssignmentQuantity } from "./production-assignment-quantity";

it("validates against server capacity, including negative, stale and mixed-hand requests", () => {
  expect(() => assertProductionAssignmentQuantity({ qty: 1 }, { qty: 0 })).toThrow();
  expect(() => assertProductionAssignmentQuantity({ qty: -1 }, { qty: 2 })).toThrow();
  expect(() => assertProductionAssignmentQuantity({ qty: 0.5 }, { qty: 2 })).toThrow();
  expect(() => assertProductionAssignmentQuantity({ lh: 1 }, { qty: 2, lh: 0, rh: 2 })).toThrow();
  expect(() => assertProductionAssignmentQuantity({ qty: 1 }, { qty: 2, lh: 1, rh: 1 })).toThrow();
  expect(() => assertProductionAssignmentQuantity({ qty: 2, lh: 1 }, { qty: 2, lh: 2 })).toThrow();
  expect(() => assertProductionAssignmentQuantity({ qty: 1 }, { qty: 2 })).not.toThrow();
  expect(() => assertProductionAssignmentQuantity({ lh: 1, rh: 1 }, { qty: 2, lh: 1, rh: 1 })).not.toThrow();
});
