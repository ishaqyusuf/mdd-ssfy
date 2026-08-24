import { describe, expect, test } from "bun:test";
import { buildDriverStopSections, getDriverManifestInput } from "./model";

describe("driver dashboard model", () => {
	test("maps URL views to the protected driver manifest filters", () => {
		expect(getDriverManifestInput({ view: "today" }).dueBuckets).toEqual([
			"overdue",
			"today",
		]);
		expect(getDriverManifestInput({ view: "exceptions" }).risks).toEqual([
			"open_exception",
		]);
		expect(getDriverManifestInput({ view: "completed" }).statuses).toEqual([
			"completed",
		]);
	});

	test("groups route work by canonical due bucket", () => {
		const stops = [
			{ id: 1, dueBucket: "today" },
			{ id: 2, dueBucket: "overdue" },
			{ id: 3, dueBucket: "tomorrow" },
			{ id: 4, dueBucket: "unscheduled" },
		] as const;
		expect(
			buildDriverStopSections(stops).map((section) => section.title),
		).toEqual(["Overdue", "Due today", "Upcoming", "Needs scheduling"]);
	});
});
