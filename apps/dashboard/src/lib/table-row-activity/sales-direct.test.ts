import { expect, it } from "bun:test";
import { salesArchiveActivity, salesDeleteActivity } from "./sales-outcomes";

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
