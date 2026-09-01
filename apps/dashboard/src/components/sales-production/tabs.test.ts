import { describe, expect, it } from "bun:test";

import { createSalesProductionPageTabs } from "./tabs";

describe("sales production page tabs", () => {
	const tabs = createSalesProductionPageTabs({
		queueCount: 120,
		dueTodayCount: 3,
		unscheduledCount: 8,
		pastDueCount: 14,
		awaitingReviewCount: 6,
		completedCount: 92,
	});

	it("puts unscheduled directly after the calendar", () => {
		expect(tabs.map((tab) => tab.title)).toEqual([
			"Due Today",
			"Calendar",
			"Unscheduled",
			"Active",
			"Past Due",
			"Review",
			"Completed",
		]);
	});

	it("uses canonical calendar and active workspace queries", () => {
		expect(tabs[1]?.params).toMatchObject({
			tab: "calendar",
			view: "calendar",
		});
		expect(tabs[2]?.params).toMatchObject({
			tab: "queue",
			view: "table",
			due: "unscheduled",
		});
		expect(tabs[2]?.count).toBe(8);
		expect(tabs[3]?.params).toMatchObject({
			tab: "queue",
			view: "table",
			due: null,
			calendarView: null,
			calendarDate: null,
		});
		expect(tabs[3]?.count).toBe(120);
	});

	it("sorts due-today and past-due tabs by the earliest due date", () => {
		expect(tabs[0]?.params).toMatchObject({
			due: "today",
			sort: "due-asc",
		});
		expect(tabs[4]?.params).toMatchObject({
			due: "overdue",
			sort: "due-asc",
		});
	});
});
