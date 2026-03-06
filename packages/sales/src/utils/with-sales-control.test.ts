import { describe, expect, it } from "bun:test";

import { __withSalesControlTestUtils } from "./with-sales-control";

describe("with-sales-control status and statistic helpers", () => {
  it("derives production status correctly", () => {
    expect(__withSalesControlTestUtils.deriveProductionStatus(0, 0)).toBe(
      "unknown",
    );
    expect(__withSalesControlTestUtils.deriveProductionStatus(10, 0)).toBe(
      "pending",
    );
    expect(__withSalesControlTestUtils.deriveProductionStatus(10, 4)).toBe(
      "in progress",
    );
    expect(__withSalesControlTestUtils.deriveProductionStatus(10, 10)).toBe(
      "completed",
    );
  });

  it("derives dispatch status from control totals with precedence", () => {
    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchCompleted: { total: 5, lhQty: 0, rhQty: 0, qty: 5 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
      }),
    ).toBe("completed");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 2, lhQty: 0, rhQty: 0, qty: 2 },
        dispatchInProgress: { total: 3, lhQty: 0, rhQty: 0, qty: 3 },
        dispatchCompleted: { total: 1, lhQty: 0, rhQty: 0, qty: 1 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
      }),
    ).toBe("in progress");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 2, lhQty: 0, rhQty: 0, qty: 2 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchCompleted: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
      }),
    ).toBe("queue");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchCompleted: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchCancelled: { total: 2, lhQty: 0, rhQty: 0, qty: 2 },
      }),
    ).toBe("cancelled");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchCompleted: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
      }),
    ).toBe("unknown");
  });

  it("computes flattened statistics with capability-aware packables", () => {
    const controls = [
      {
        uid: "c1",
        salesId: 1,
        produceable: true,
        shippable: true,
        stats: {
          qty: { total: 10, lhQty: 4, rhQty: 6, qty: 0 },
          prodAssigned: { total: 8, lhQty: 3, rhQty: 5, qty: 0 },
          prodCompleted: { total: 6, lhQty: 2, rhQty: 4, qty: 0 },
          dispatchAssigned: { total: 1, lhQty: 0, rhQty: 1, qty: 0 },
          dispatchInProgress: { total: 1, lhQty: 1, rhQty: 0, qty: 0 },
          dispatchCompleted: { total: 2, lhQty: 1, rhQty: 1, qty: 0 },
          dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        },
      },
      {
        uid: "c2",
        salesId: 1,
        produceable: false,
        shippable: true,
        stats: {
          qty: { total: 5, lhQty: 0, rhQty: 0, qty: 5 },
          prodAssigned: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
          prodCompleted: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
          dispatchAssigned: { total: 1, lhQty: 0, rhQty: 0, qty: 1 },
          dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
          dispatchCompleted: { total: 1, lhQty: 0, rhQty: 0, qty: 1 },
          dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0, qty: 0 },
        },
      },
    ];

    const stat = __withSalesControlTestUtils.toStatistic(
      controls,
      { total: 4, lhQty: 1, rhQty: 3, qty: 0 },
      "in progress",
    );

    expect(stat.qty.total).toBe(15);
    expect(stat.pendingAssignment.total).toBe(2);
    expect(stat.pendingSubmission.total).toBe(2);
    expect(stat.packables.total).toBe(5);
    expect(stat.pendingPacking.total).toBe(11);
    expect(stat.pendingDispatch.total).toBe(9);
    expect(stat.packed.total).toBe(4);
    expect(stat.productionStatus).toBe("in progress");
    expect(stat.dispatchStatus).toBe("in progress");
  });
});
