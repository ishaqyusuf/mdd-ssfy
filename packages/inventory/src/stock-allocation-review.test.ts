import { describe, expect, test } from "bun:test";

import {
  approveBulkStockAllocation,
  approveStockAllocation,
  rejectStockAllocation,
} from "./inventory";

describe("stock allocation review guardrails", () => {
  test("approve skips allocations that are no longer pending review", async () => {
    const calls: string[] = [];
    const db = {
      stockAllocation: {
        findFirst: async () => null,
        updateMany: async () => {
          calls.push("stockAllocation.updateMany");
          return { count: 1 };
        },
      },
      lineItemComponents: {
        findUnique: async () => {
          calls.push("lineItemComponents.findUnique");
          return null;
        },
      },
    };

    const result = await approveStockAllocation(db as any, {
      allocationId: 42,
    });

    expect(result).toEqual({
      ok: true,
      allocationId: 42,
      skipped: true,
      reason: "not_pending_review",
    });
    expect(calls).toEqual([]);
  });

  test("reject skips allocations that are no longer pending review", async () => {
    const calls: string[] = [];
    const db = {
      stockAllocation: {
        findFirst: async () => null,
        updateMany: async () => {
          calls.push("stockAllocation.updateMany");
          return { count: 1 };
        },
      },
      lineItemComponents: {
        findUnique: async () => {
          calls.push("lineItemComponents.findUnique");
          return null;
        },
      },
    };

    const result = await rejectStockAllocation(db as any, {
      allocationId: 42,
    });

    expect(result).toEqual({
      ok: true,
      allocationId: 42,
      skipped: true,
      reason: "not_pending_review",
    });
    expect(calls).toEqual([]);
  });

  test("bulk approve mutates only pending-review allocations and reports skipped rows", async () => {
    const calls: Array<{ name: string; payload?: unknown }> = [];
    const db = {
      stockAllocation: {
        findMany: async () => [
          {
            id: 1,
            lineItemComponentId: 101,
          },
        ],
        updateMany: async (payload: unknown) => {
          calls.push({ name: "stockAllocation.updateMany", payload });
          return { count: 1 };
        },
      },
      lineItemComponents: {
        findUnique: async () => ({
          id: 101,
          qty: 1,
          inboundDemands: [],
          stockAllocations: [{ qty: 1 }],
        }),
        update: async (payload: unknown) => {
          calls.push({ name: "lineItemComponents.update", payload });
          return {};
        },
      },
    };

    const result = await approveBulkStockAllocation(db as any, {
      allocationIds: [1, 1, 2, 3],
    });

    expect(result).toEqual({
      ok: true,
      count: 1,
      skippedCount: 2,
    });
    expect(calls[0]).toMatchObject({
      name: "stockAllocation.updateMany",
      payload: {
        where: {
          id: {
            in: [1],
          },
          deletedAt: null,
          status: "pending_review",
        },
        data: {
          status: "approved",
        },
      },
    });
    expect(calls[1]).toMatchObject({
      name: "lineItemComponents.update",
      payload: {
        where: {
          id: 101,
        },
        data: {
          qtyAllocated: 1,
          status: "allocated",
        },
      },
    });
  });

  test("bulk approve reports skipped rows when pending allocations are claimed by another run first", async () => {
    const calls: string[] = [];
    const db = {
      stockAllocation: {
        findMany: async () => [
          {
            id: 1,
            lineItemComponentId: 101,
          },
        ],
        updateMany: async () => {
          calls.push("stockAllocation.updateMany");
          return { count: 0 };
        },
      },
      lineItemComponents: {
        findUnique: async () => {
          calls.push("lineItemComponents.findUnique");
          return null;
        },
        update: async () => {
          calls.push("lineItemComponents.update");
          return {};
        },
      },
    };

    const result = await approveBulkStockAllocation(db as any, {
      allocationIds: [1, 2],
    });

    expect(result).toEqual({
      ok: true,
      count: 0,
      skippedCount: 2,
    });
    expect(calls).toEqual(["stockAllocation.updateMany"]);
  });
});
