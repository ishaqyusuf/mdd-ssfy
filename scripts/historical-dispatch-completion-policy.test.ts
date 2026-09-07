import { describe, expect, test } from "bun:test";
import { classifyHistoricalCompletion, databaseTarget, migrationRequestId, type HistoricalCompletionSource } from "./historical-dispatch-completion-policy";
const source = (): HistoricalCompletionSource => ({
  id: 1, status: "pending", deletedAt: null, completionRecords: [],
  deliveries: [{ id: 451, status: "completed", meta: {}, createdAt: null, deliveredAt: null, deletedAt: null }],
});
describe("historical completion adoption", () => {
  test("accepts every completed dispatch missing proof without item or old-job evidence", () => {
    expect(classifyHistoricalCompletion(source())).toEqual({ eligible: true, reason: "HISTORICAL_SHORTCUT", dispatchIds: [451], effectiveAt: null });
  });
  test("does not reinterpret complete proof as a shortcut even if inventory is missing", () => {
    const row = source(); row.deliveries[0]!.meta = { dispatchCompletion: { status: "completed" } };
    expect(classifyHistoricalCompletion(row).eligible).toBe(false);
  });
  test("coalesces duplicate dispatches into one order and preserves actual completion date", () => {
    const row = source(); row.deliveries.push({ ...row.deliveries[0]!, id: 452, deliveredAt: "2025-03-26T10:00:00.000Z" });
    expect(classifyHistoricalCompletion(row)).toMatchObject({ eligible: true, dispatchIds: [451, 452], effectiveAt: "2025-03-26T10:00:00.000Z" });
  });
  test("preserves cancellation, reopening and existing completion", () => {
    for (const state of ["ACTIVE", "CANCELLED"]) {
      const row = source(); row.completionRecords.push({ milestone: "FULFILLMENT_COMPLETED", state });
      expect(classifyHistoricalCompletion(row).eligible).toBe(false);
    }
    const row = source(); row.deliveries.push({ ...row.deliveries[0]!, id: 452, status: "queue" });
    expect(classifyHistoricalCompletion(row).reason).toBe("LATER_DISPATCH_REOPENED_OR_CANCELLED");
    row.status = "cancelled";
    expect(classifyHistoricalCompletion(row).reason).toBe("ORDER_CANCELLED_OR_DELETED");
  });
  test("request identity is stable and separates targets, batches and recovery", () => {
    expect(migrationRequestId("local", "batch", 1)).toBe(migrationRequestId("local", "batch", 1));
    expect(new Set([migrationRequestId("local", "batch", 1), migrationRequestId("production", "batch", 1), migrationRequestId("local", "batch", 1, "recover")]).size).toBe(3);
  });
  test("target fingerprint excludes credentials and local cannot point at production", () => {
    expect(databaseTarget("mysql://user:secret@localhost:3306/gnd", "local")).toEqual(databaseTarget("mysql://other:changed@localhost:3306/gnd", "local"));
    expect(() => databaseTarget("mysql://u:p@prod.example/gnd", "local")).toThrow();
  });
});

test("an earlier cancelled completion does not veto a later shortcut", () => {
  const row = source();
  row.deliveries[0]!.deliveredAt = "2025-03-26T12:00:00.000Z";
  row.completionRecords.push({ milestone: "FULFILLMENT_COMPLETED", state: "CANCELLED", cancelledAt: "2025-03-25T12:00:00.000Z" });
  expect(classifyHistoricalCompletion(row).eligible).toBe(true);
  row.completionRecords[0]!.cancelledAt = "2025-03-27T12:00:00.000Z";
  expect(classifyHistoricalCompletion(row).eligible).toBe(false);
});
