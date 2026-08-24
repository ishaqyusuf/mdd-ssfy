import { describe, expect, it } from "bun:test";

import { whereDispatch } from "./prisma-where";

describe("dispatch query scope", () => {
	it("applies the assigned driver filter in development and production", () => {
		expect(whereDispatch({ driversId: [42], tab: "all" })).toMatchObject({
			driverId: { in: [42] },
		});
	});

	it("turns due buckets into database date ranges", () => {
		const where = whereDispatch({
			tab: "all",
			dueBuckets: ["overdue", "today"],
			now: new Date("2026-08-06T15:00:00.000Z"),
		} as any);
		const serialized = JSON.stringify(where);

		expect(serialized).toContain("2026-08-06T04:00:00.000Z");
		expect(serialized).toContain('"lt"');
		expect(serialized).toContain('"gte"');
	});

	it("keeps completed scope and search server-owned", () => {
		const where = whereDispatch({ tab: "completed", q: "09176PC" });
		const serialized = JSON.stringify(where);
		expect(serialized).toContain('"status":"completed"');
		expect(serialized).toContain('"contains":"09176PC"');
	});
});
