import { describe, expect, it } from "bun:test";

import { __withSalesControlTestUtils } from "./with-sales-control";

describe("with-sales-control status and statistic helpers", () => {
  it("derives production status correctly", () => {
    expect(__withSalesControlTestUtils.deriveProductionStatus(0, 0)).toBe(
      "unknown"
    );
    expect(__withSalesControlTestUtils.deriveProductionStatus(10, 0)).toBe(
      "pending"
    );
    expect(__withSalesControlTestUtils.deriveProductionStatus(10, 4)).toBe(
      "in progress"
    );
    expect(__withSalesControlTestUtils.deriveProductionStatus(10, 10)).toBe(
      "completed"
    );
  });

  it("derives dispatch status from control totals with precedence", () => {
    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchCompleted: { total: 5, lhQty: 0, rhQty: 0 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0 },
      })
    ).toBe("completed");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 2, lhQty: 0, rhQty: 0 },
        dispatchInProgress: { total: 3, lhQty: 0, rhQty: 0 },
        dispatchCompleted: { total: 1, lhQty: 0, rhQty: 0 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0 },
      })
    ).toBe("in progress");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 2, lhQty: 0, rhQty: 0 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchCompleted: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0 },
      })
    ).toBe("queue");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchCompleted: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchCancelled: { total: 2, lhQty: 0, rhQty: 0 },
      })
    ).toBe("cancelled");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchInProgress: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchCompleted: { total: 0, lhQty: 0, rhQty: 0 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0 },
      })
    ).toBe("unknown");
  });

  it("computes flattened statistics with qty matrices", () => {
    const stat = __withSalesControlTestUtils.toStatistic(
      {
        qty: { total: 10, lhQty: 4, rhQty: 6 },
        prodAssigned: { total: 8, lhQty: 3, rhQty: 5 },
        prodCompleted: { total: 6, lhQty: 2, rhQty: 4 },
        dispatchAssigned: { total: 1, lhQty: 0, rhQty: 1 },
        dispatchInProgress: { total: 2, lhQty: 1, rhQty: 1 },
        dispatchCompleted: { total: 3, lhQty: 1, rhQty: 2 },
        dispatchCancelled: { total: 0, lhQty: 0, rhQty: 0 },
      },
      {
        total: 4,
        lhQty: 1,
        rhQty: 3,
      },
      "in progress"
    );

    expect(stat.qty).toEqual({
      total: 10,
      lhQty: 4,
      rhQty: 6,
    });
    expect(stat.pendingAssignment).toEqual({
      total: 2,
      lhQty: 1,
      rhQty: 1,
    });
    expect(stat.pendingSubmission).toEqual({
      total: 2,
      lhQty: 1,
      rhQty: 1,
    });
    expect(stat.packables).toEqual({
      total: 2,
      lhQty: 1,
      rhQty: 1,
    });
    expect(stat.pendingPacking).toEqual({
      total: 6,
      lhQty: 3,
      rhQty: 3,
    });
    expect(stat.packed).toEqual({
      total: 4,
      lhQty: 1,
      rhQty: 3,
    });
    expect(stat.pendingDispatch).toEqual({
      total: 4,
      lhQty: 2,
      rhQty: 2,
    });
    expect(stat.productionStatus).toBe("in progress");
    expect(stat.dispatchStatus).toBe("in progress");
  });
});
