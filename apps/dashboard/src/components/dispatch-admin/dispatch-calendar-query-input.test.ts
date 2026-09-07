import { describe, expect, it } from "bun:test";

import { createDispatchCalendarQueryInput } from "./dispatch-calendar-query-input";

describe("createDispatchCalendarQueryInput", () => {
	it("keeps undated query keys independent of calendar navigation", () => {
		const first = createDispatchCalendarQueryInput({}, { from: "2026-09-01", to: "2026-09-30" }, true);
		const second = createDispatchCalendarQueryInput({}, { from: "2026-10-01", to: "2026-10-31" }, true);
		expect(first).toEqual(second);
		expect("from" in first).toBe(false);
		expect("to" in first).toBe(false);
	});
	it("builds the exact bounded key shared by server hydration and the client calendar", () => {
		expect(
			createDispatchCalendarQueryInput({
				q: "09530DB",
				stages: ["ready_to_assign"],
				driversId: [4],
				dueBuckets: ["overdue"],
				deliveryModes: ["delivery"],
				risks: ["overdue"],
			}, { from: "2026-09-07", to: "2026-09-13" }),
		).toEqual({
			section: "calendar",
			from: "2026-09-07",
			to: "2026-09-13",
			unscheduled: false,
			q: "09530DB",
			stages: ["ready_to_assign"],
			driversId: [4],
			dueBuckets: ["overdue"],
			deliveryModes: ["delivery"],
			risks: ["overdue"],
			size: 100,
		});
	});
});
