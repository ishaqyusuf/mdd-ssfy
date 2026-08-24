import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import { buildDriverWorkQueueSections } from "./driver-work-queue-model";

describe("driver work queue model", () => {
	it("keeps Completed and debounced server search in the existing list shell", () => {
		const source = readFileSync(
			new URL("../components/dispatch-list-screen.tsx", import.meta.url),
			"utf8",
		);
		expect(source).toContain('key: "completed"');
		expect(source).toContain('tab: "completed"');
		expect(source).toContain("useDebounce(search.trim(), 350)");
		expect(source).toContain("q: debouncedSearch || undefined");
	});

	it("keeps overdue, today, tomorrow, and upcoming work separate", () => {
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
			"Tomorrow",
			"Upcoming",
			"Needs Scheduling",
		]);
		expect(
			sections.map((section) => section.data.map((item) => item.id)),
		).toEqual([[1], [2], [4], [3], [5]]);
	});
});
