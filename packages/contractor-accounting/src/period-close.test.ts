import { describe, expect, it } from "bun:test";

import {
	accountingPeriodsOverlap,
	assertContractorAccountingDateIsWritable,
} from "./period-close";

describe("contractor accounting periods", () => {
	it("blocks writes inside a closed end-exclusive period", () => {
		const periods = [
			{
				id: "jan",
				from: "2026-01-01T05:00:00.000Z",
				toExclusive: "2026-02-01T05:00:00.000Z",
				status: "CLOSED" as const,
			},
		];
		expect(() =>
			assertContractorAccountingDateIsWritable(
				periods,
				"2026-01-31T23:59:59.999Z",
			),
		).toThrow("period is closed");
		expect(() =>
			assertContractorAccountingDateIsWritable(
				periods,
				"2026-02-01T05:00:00.000Z",
			),
		).not.toThrow();
	});

	it("detects overlapping periods", () => {
		expect(
			accountingPeriodsOverlap(
				{ from: "2026-01-01", toExclusive: "2026-02-01" },
				{ from: "2026-01-15", toExclusive: "2026-03-01" },
			),
		).toBe(true);
	});
});
