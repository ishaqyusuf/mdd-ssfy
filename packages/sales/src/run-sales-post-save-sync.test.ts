import { describe, expect, test } from "bun:test";
import { runSalesPostSaveSync } from "./run-sales-post-save-sync";

describe("post-save sales calibration", () => {
	test("publishes workflow scope before inventory and preserves retryable inventory errors", async () => {
		const calls: string[] = [];
		const failure = new Error("Inventory unavailable");
		await expect(
			runSalesPostSaveSync(
				{} as never,
				{ salesOrderId: 1 },
				{
					calibrate: async () => {
						calls.push("calibrated");
						return { skipped: false };
					},
					syncInventory: async () => {
						calls.push("inventory");
						throw failure;
					},
					refreshSummary: async () => {
						calls.push("refreshed");
						return { skipped: false };
					},
				},
			),
		).rejects.toThrow("Inventory unavailable");
		expect(calls).toEqual(["calibrated", "inventory", "refreshed"]);
	});
	test("does not run inventory for a deleted order", async () => {
		let ran = false;
		const result = await runSalesPostSaveSync(
			{} as never,
			{ salesOrderId: 1 },
			{
				calibrate: async () => ({ skipped: true }),
				syncInventory: async () => {
					ran = true;
					throw new Error("unexpected");
				},
			},
		);
		expect(result.calibration.skipped).toBe(true);
		expect(ran).toBe(false);
	});
	test("legacy saves still calibrate while leaving inventory adaptation independent", async () => {
		let calibrated = false;
		await runSalesPostSaveSync(
			{} as never,
			{ salesOrderId: 1, skipInventory: true },
			{
				calibrate: async () => {
					calibrated = true;
					return { skipped: false };
				},
				syncInventory: async () => {
					throw new Error("must retain legacy inventory");
				},
			},
		);
		expect(calibrated).toBe(true);
	});
	test("a calibration failure retries instead of publishing misleading success", async () => {
		await expect(
			runSalesPostSaveSync(
				{} as never,
				{ salesOrderId: 1 },
				{
					calibrate: async () => {
						throw new Error("Rebuild failed");
					},
					syncInventory: async () => {
						throw new Error("should not run");
					},
				},
			),
		).rejects.toThrow("Rebuild failed");
	});
});
