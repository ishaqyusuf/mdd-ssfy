import { expect, it } from "bun:test";
import { salesArchiveActivity, salesDeleteActivity, salesBatchDeleteActivity } from "./sales-outcomes";

it("only confirms deletion when the single-order endpoint confirms its commit", () => {
  const invocation = salesDeleteActivity("owner").describe({ salesId: 12 });
  expect(invocation.entityIds).toEqual([12]);
  expect(invocation.resolve(true)).toEqual([{ entityId: 12, phase: "success", label: "Deleted" }]);
  expect(invocation.resolve({ count: 1 })[0]?.phase).toBe("unknown");
});

it("resolves archive batches per changed id without promoting skipped or ambiguous rows", () => {
  const invocation = salesArchiveActivity("owner").describe({ salesIds: [1, 2, 3], archived: true });
  expect(invocation.resolve({ changed: [1], skipped: [{ salesId: 2 }] }).map(row => row.phase)).toEqual(["success", "unknown", "unknown"]);
  expect(invocation.resolve({ changed: [1, 1] })[0]?.phase).toBe("unknown");
  expect(invocation.resolve({ changed: [1], skipped: [{ salesId: 1 }] })[0]?.phase).toBe("unknown");
  expect(salesArchiveActivity("owner").describe({ salesIds: [1], archived: false }).resolve({ changed: [1] })[0]?.label).toBe("Restored");
});

it("captures only requested batch rows and requires unique confirmed deletion IDs", () => {
  const sales = [{ orderNo: "A", salesId: 1 }, { orderNo: "B", salesId: 2 }, { orderNo: "C", salesId: 3 }];
  const invocation = salesBatchDeleteActivity("owner", sales).describe({ orderIds: ["A", "B"] });
  sales[0]!.salesId = 99;
  expect(invocation.entityIds).toEqual([1, 2]);
  expect(invocation.resolve({ count: 2 }).map(row => row.phase)).toEqual(["unknown", "unknown"]);
  expect(invocation.resolve({ deletedSalesIds: [1, 3] }).map(row => row.phase)).toEqual(["success", "unknown"]);
  expect(invocation.resolve({ deletedSalesIds: [1, 1, 2] }).map(row => row.phase)).toEqual(["unknown", "success"]);
});
