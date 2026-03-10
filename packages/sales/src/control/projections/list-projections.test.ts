import { describe, expect, it } from "bun:test";
import { projectDispatchListControl } from "./dispatch-list-projection";
import { projectSalesListControl } from "./sales-list-projection";
import type { SalesControlStatistic } from "../domain/types";

const statistic: SalesControlStatistic = {
  qty: { lhQty: 1, rhQty: 1, qty: 2, total: 2 },
  prodAssigned: { lhQty: 1, rhQty: 0, qty: 1, total: 1 },
  prodCompleted: { lhQty: 0, rhQty: 1, qty: 1, total: 1 },
  dispatchAssigned: { lhQty: 0, rhQty: 0, qty: 1, total: 1 },
  dispatchInProgress: { lhQty: 0, rhQty: 0, qty: 0, total: 0 },
  dispatchCompleted: { lhQty: 0, rhQty: 0, qty: 1, total: 1 },
  dispatchCancelled: { lhQty: 0, rhQty: 0, qty: 0, total: 0 },
  pendingAssignment: { lhQty: 0, rhQty: 0, qty: 1, total: 1 },
  pendingSubmission: { lhQty: 0, rhQty: 0, qty: 1, total: 1 },
  packables: { lhQty: 0, rhQty: 0, qty: 2, total: 2 },
  pendingPacking: { lhQty: 0, rhQty: 0, qty: 1, total: 1 },
  pendingDispatch: { lhQty: 0, rhQty: 0, qty: 1, total: 1 },
  packed: { lhQty: 0, rhQty: 0, qty: 1, total: 1 },
  productionStatus: "in progress",
  dispatchStatus: "queue",
};

describe("sales list projection", () => {
  it("returns only requested sales control fields", () => {
    const projection = projectSalesListControl(statistic, [
      "productionStatus",
      "pendingDispatch",
    ]);

    expect(projection.selectedFields).toEqual([
      "productionStatus",
      "pendingDispatch",
    ]);
    expect(projection.productionStatus).toBe("in progress");
    expect(projection.pendingDispatch?.total).toBe(1);
    expect(projection.dispatchStatus).toBeUndefined();
    expect(projection.packables).toBeUndefined();
    expect((projection as any).qty).toBeUndefined();
  });
});

describe("dispatch list projection", () => {
  it("returns only requested dispatch control fields", () => {
    const projection = projectDispatchListControl(statistic, [
      "dispatchStatus",
      "packed",
      "pendingPacking",
    ]);

    expect(projection.selectedFields).toEqual([
      "dispatchStatus",
      "packed",
      "pendingPacking",
    ]);
    expect(projection.dispatchStatus).toBe("queue");
    expect(projection.packed?.total).toBe(1);
    expect(projection.pendingPacking?.total).toBe(1);
    expect(projection.dispatchAssigned).toBeUndefined();
    expect(projection.packables).toBeUndefined();
  });
});
