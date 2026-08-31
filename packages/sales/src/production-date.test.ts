import { describe, expect, it } from "bun:test";

import {
	createProductionDueDate,
	getProductionDateRange,
	getProductionDueDatePresentation,
	getProductionQueueBoundaries,
} from "./production-date";

describe("production calendar dates", () => {
	it("stores a selected calendar day independently of the browser timezone", () => {
		expect(
			createProductionDueDate({ year: 2026, month: 8, day: 30 }).toISOString(),
		).toBe("2026-08-30T12:00:00.000Z");
	});

	it("builds queue boundaries from the New York business date", () => {
		const boundaries = getProductionQueueBoundaries({
			now: new Date("2026-08-30T04:30:00.000Z"),
			timeZone: "America/New_York",
		});

		expect(boundaries.today.gte.toISOString()).toBe(
			"2026-08-30T00:00:00.000Z",
		);
		expect(boundaries.today.lt.toISOString()).toBe(
			"2026-08-31T00:00:00.000Z",
		);
		expect(boundaries.tomorrow.gte.toISOString()).toBe(
			"2026-08-31T00:00:00.000Z",
		);
	});

	it("uses half-open UTC ranges for exact production calendar dates", () => {
		const range = getProductionDateRange("2026-08-30");

		expect(range.gte.toISOString()).toBe("2026-08-30T00:00:00.000Z");
		expect(range.lt.toISOString()).toBe("2026-08-31T00:00:00.000Z");
	});

	it("presents a due date as Today instead of an hour countdown", () => {
		expect(
			getProductionDueDatePresentation(
				new Date("2026-08-30T12:00:00.000Z"),
				{
					now: new Date("2026-08-30T18:00:00.000Z"),
					timeZone: "America/New_York",
				},
			).label,
		).toBe("Today");
	});
});
