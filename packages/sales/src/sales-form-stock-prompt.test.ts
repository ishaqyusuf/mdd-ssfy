import { expect, test } from "bun:test";
import { prepareSalesFormStockPrompt } from "./sales-form-stock-prompt";

test("after-create check waits for needs preparation and is handled only once", async () => {
	const calls: string[] = [];
	const handled = new Set<number>();
	const deps = {
		prepare: async () => {
			calls.push("prepare");
		},
		readPlan: async () => {
			calls.push("read");
			return {
				canApply: true,
				rows: [{ promptAvailableStock: true, applyQty: 3 }],
			};
		},
	};
	expect(await prepareSalesFormStockPrompt(1, handled, deps)).toMatchObject({
		canApply: true,
	});
	expect(calls).toEqual(["prepare", "read"]);
	expect(await prepareSalesFormStockPrompt(1, handled, deps)).toBeNull();
	expect(calls).toHaveLength(2);
});
test("failed preparation remains retryable and never reads stale needs", async () => {
	const handled = new Set<number>();
	let reads = 0;
	await expect(
		prepareSalesFormStockPrompt(1, handled, {
			prepare: async () => {
				throw Error("retry");
			},
			readPlan: async () => {
				reads++;
				return { canApply: true, rows: [] };
			},
		}),
	).rejects.toThrow("retry");
	expect(handled.has(1)).toBe(false);
	expect(reads).toBe(0);
	expect(
		await prepareSalesFormStockPrompt(1, handled, {
			prepare: async () => {},
			readPlan: async () => ({
				canApply: true,
				rows: [{ promptAvailableStock: true, applyQty: 2 }],
			}),
		}),
	).not.toBeNull();
});
test("default-off, no stock and read-only orders do not prompt", async () => {
	for (const plan of [
		{ canApply: true, rows: [{ promptAvailableStock: false, applyQty: 3 }] },
		{ canApply: true, rows: [{ promptAvailableStock: true, applyQty: 0 }] },
		{ canApply: false, rows: [{ promptAvailableStock: true, applyQty: 3 }] },
	]) {
		expect(
			await prepareSalesFormStockPrompt(1, new Set(), {
				prepare: async () => {},
				readPlan: async () => plan,
			}),
		).toBeNull();
	}
});
