import { describe, expect, it } from "bun:test";
import { resolveDispatchBatchDueDates } from "./dispatch-batch-plan";

describe("resolveDispatchBatchDueDates", () => {
	it("applies one override without mutating the individual dates", () => {
		const firstDate = new Date("2026-09-01T12:00:00.000Z");
		const secondDate = new Date("2026-09-04T12:00:00.000Z");
		const override = new Date("2026-09-08T12:00:00.000Z");

		const plan = resolveDispatchBatchDueDates({
			orders: [
				{ salesId: 101, dueDate: firstDate },
				{ salesId: 102, dueDate: secondDate },
			],
			overrideDueDate: override,
		});

		expect(plan.map((order) => order.dueDate.toISOString())).toEqual([
			override.toISOString(),
			override.toISOString(),
		]);
		expect(plan.map((order) => order.individualDueDate.toISOString())).toEqual([
			firstDate.toISOString(),
			secondDate.toISOString(),
		]);
		expect(plan.every((order) => order.overrideApplied)).toBe(true);
	});

	it("restores the individual dates when the override is absent", () => {
		const plan = resolveDispatchBatchDueDates({
			orders: [
				{ salesId: 101, dueDate: new Date("2026-09-01T12:00:00.000Z") },
				{ salesId: 102, dueDate: new Date("2026-09-04T12:00:00.000Z") },
			],
			overrideDueDate: null,
		});

		expect(plan.map((order) => order.dueDate.toISOString())).toEqual([
			"2026-09-01T12:00:00.000Z",
			"2026-09-04T12:00:00.000Z",
		]);
		expect(plan.every((order) => !order.overrideApplied)).toBe(true);
	});

	it("rejects duplicate orders", () => {
		expect(() =>
			resolveDispatchBatchDueDates({
				orders: [
					{ salesId: 101, dueDate: new Date("2026-09-01") },
					{ salesId: 101, dueDate: new Date("2026-09-02") },
				],
			}),
		).toThrow("selected more than once");
	});
});
