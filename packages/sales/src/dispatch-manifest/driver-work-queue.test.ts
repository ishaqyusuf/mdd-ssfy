import { describe, expect, it } from "bun:test";

import {
	DEFAULT_DISPATCH_TIME_ZONE,
	getDispatchDueBucket,
	getDispatchDateBoundaries,
	getDispatchDuePresentation,
	summarizeDriverWorkQueue,
} from "./driver-work-queue";

describe("driver work queue due dates", () => {
	const now = new Date("2026-08-06T15:00:00.000Z");

	it("separates overdue, today, tomorrow, upcoming, and unscheduled work", () => {
		expect(
			getDispatchDueBucket("2026-08-05T12:00:00.000Z", {
				now,
				timeZone: DEFAULT_DISPATCH_TIME_ZONE,
			}),
		).toBe("overdue");
		expect(
			getDispatchDueBucket("2026-08-06T18:00:00.000Z", { now }),
		).toBe("today");
		expect(
			getDispatchDueBucket("2026-08-07T18:00:00.000Z", { now }),
		).toBe("tomorrow");
		expect(
			getDispatchDueBucket("2026-08-12T18:00:00.000Z", { now }),
		).toBe("upcoming");
		expect(getDispatchDueBucket(null, { now })).toBe("unscheduled");
	});

	it("returns explicit driver-facing labels for an overdue delivery", () => {
		expect(
			getDispatchDuePresentation("2026-07-30T16:00:00.000Z", { now }),
		).toEqual({
				bucket: "overdue",
				dateLabel: "Delivery due Jul 30",
				statusLabel: "7 days overdue",
			});
	});

	it("summarizes the complete server result instead of one paginated page", () => {
		expect(
			summarizeDriverWorkQueue(
				[
					{ dueDate: "2026-08-05T12:00:00.000Z", status: "queue" },
					{ dueDate: "2026-08-06T18:00:00.000Z", status: "packed" },
					{ dueDate: "2026-08-07T18:00:00.000Z", status: "in progress" },
					{ dueDate: null, status: "queue" },
				],
				{ now },
			),
		).toEqual({
			total: 4,
			inProgress: 1,
			byDueBucket: {
				overdue: 1,
				today: 1,
				tomorrow: 1,
				upcoming: 0,
				unscheduled: 1,
			},
			byStatus: { queue: 2, packed: 1, "in progress": 1 },
		});
	});

	it("builds UTC query boundaries for the business timezone", () => {
		const boundaries = getDispatchDateBoundaries({ now });
		expect(boundaries.startToday.toISOString()).toBe(
			"2026-08-06T04:00:00.000Z",
		);
		expect(boundaries.startTomorrow.toISOString()).toBe(
			"2026-08-07T04:00:00.000Z",
		);
		expect(boundaries.startAfterTomorrow.toISOString()).toBe(
			"2026-08-08T04:00:00.000Z",
		);
	});
});
