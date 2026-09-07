import { describe, expect, it } from "bun:test";

import { createDispatchCalendarQueryInput } from "./dispatch-calendar-query-input";

describe("createDispatchCalendarQueryInput", () => {
	it("builds the exact bounded key shared by server hydration and the client calendar", () => {
		expect(
			createDispatchCalendarQueryInput({
				q: "09530DB",
				stages: ["ready_to_assign"],
				driversId: [4],
				dueBuckets: ["overdue"],
				deliveryModes: ["delivery"],
				risks: ["overdue"],
			}),
		).toEqual({
			section: "calendar",
			q: "09530DB",
			stages: ["ready_to_assign"],
			driversId: [4],
			dueBuckets: ["overdue"],
			deliveryModes: ["delivery"],
			risks: ["overdue"],
			size: 500,
		});
	});
});
