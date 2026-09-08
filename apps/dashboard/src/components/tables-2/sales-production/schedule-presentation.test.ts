import { expect, it } from "bun:test";
import { getSalesProductionSchedulePresentation } from "./schedule-presentation";

it("shows an absolute date and a production-calendar schedule label", () => {
	const now = new Date("2026-09-08T15:00:00Z");
	for (const [value, date, label] of [
		[null, "Unscheduled", "Schedule required"],
		["invalid", "Unscheduled", "Schedule required"],
		["2026-09-08", "Sep 8", "Today"],
		["2026-09-09", "Sep 9", "Tomorrow"],
		["2026-09-06", "Sep 6", "2 days overdue"],
		["2026-09-11", "Sep 11", "In 3 days"],
		["2025-09-08", "Sep 8, 2025", "365 days overdue"],
	]) {
		expect(getSalesProductionSchedulePresentation(value, now)).toEqual({
			date,
			label,
		});
	}
});

it("uses the Production business day around midnight without shifting the due date", () => {
	const now = new Date("2026-09-09T01:00:00Z");
	const presentation = getSalesProductionSchedulePresentation(
		"2026-09-08T00:00:00Z",
		now,
	);
	expect(presentation).toEqual({ date: "Sep 8", label: "Today" });
});
