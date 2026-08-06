import { describe, expect, it } from "bun:test";

import { buildDriverWorkQueueSections } from "./driver-work-queue-model";

describe("driver work queue model", () => {
	it("keeps overdue work separate from due-today and upcoming work", () => {
		const sections = buildDriverWorkQueueSections([
			{ id: 3, dueBucket: "upcoming" },
			{ id: 1, dueBucket: "overdue" },
			{ id: 2, dueBucket: "today" },
			{ id: 4, dueBucket: "tomorrow" },
			{ id: 5, dueBucket: "unscheduled" },
		]);

		expect(sections.map((section) => section.title)).toEqual([
			"Overdue",
			"Due Today",
			"Upcoming",
			"Needs Scheduling",
		]);
		expect(sections.map((section) => section.data.map((item) => item.id))).toEqual([
			[1],
			[2],
			[3, 4],
			[5],
		]);
	});
});
