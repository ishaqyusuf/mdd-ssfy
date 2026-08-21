import { describe, expect, it } from "bun:test";

import { createWorkerProductionPageTabs } from "./worker-tabs";

describe("worker production page tabs", () => {
	it("keeps every worker view URL-owned and account-scoped by its server query", () => {
		const tabs = createWorkerProductionPageTabs({
			dueTodayCount: 3,
			unscheduledCount: 5,
			pastDueCount: 7,
			futureCount: 11,
			completedCount: 19,
		});

		expect(tabs.map((tab) => tab.title)).toEqual([
			"Due Today",
			"Calendar",
			"Unscheduled",
			"Past Due",
			"Future",
			"Completed",
		]);
		expect(tabs[0]?.count).toBe(3);
		expect(tabs[2]?.count).toBe(5);
		expect(tabs[2]?.params?.show).toBe("unscheduled");
		expect(tabs[3]?.count).toBe(7);
		expect(tabs[4]?.count).toBe(11);
		expect(tabs[5]?.count).toBe(19);
		expect(tabs[4]?.params?.show).toBe("future");
		expect(tabs[5]?.params).toMatchObject({
			tab: "completed",
			production: "completed",
		});
	});
});
