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
        dispatchAssigned: 0,
        dispatchInProgress: 0,
        dispatchCompleted: 5,
        dispatchCancelled: 0,
      })
    ).toBe("completed");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: 2,
        dispatchInProgress: 3,
        dispatchCompleted: 1,
        dispatchCancelled: 0,
      })
    ).toBe("in progress");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: 2,
        dispatchInProgress: 0,
        dispatchCompleted: 0,
        dispatchCancelled: 0,
      })
    ).toBe("queue");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: 0,
        dispatchInProgress: 0,
        dispatchCompleted: 0,
        dispatchCancelled: 2,
      })
    ).toBe("cancelled");

    expect(
      __withSalesControlTestUtils.deriveDispatchStatusFromControls({
        dispatchAssigned: 0,
        dispatchInProgress: 0,
        dispatchCompleted: 0,
        dispatchCancelled: 0,
      })
    ).toBe("unknown");
  });

  it("computes minimal statistic with clamped pending and packable qty", () => {
    const stat = __withSalesControlTestUtils.toStatistic(
      {
        qty: 10,
        prodAssigned: 8,
        prodCompleted: 6,
        dispatchAssigned: 1,
        dispatchInProgress: 2,
        dispatchCompleted: 3,
        dispatchCancelled: 0,
      },
      {
        total: 5,
        completed: 4,
        pending: 1,
      },
      "in progress"
    );

    expect(stat.assignment).toEqual({
      total: 10,
      completed: 8,
      pending: 2,
    });
    expect(stat.submission).toEqual({
      total: 8,
      completed: 6,
      pending: 2,
    });
    expect(stat.packed).toEqual({ total: 5, completed: 4, pending: 1 });
    expect(stat.packable).toEqual({ total: 2 });
    expect(stat.productionStatus).toBe("in progress");
    expect(stat.dispatchStatus).toBe("in progress");
  });
});
