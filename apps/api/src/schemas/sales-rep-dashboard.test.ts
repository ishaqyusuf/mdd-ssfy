import { describe, expect, it } from "bun:test";
import { salesRepDashboardPeriodSchema } from "./sales-rep-dashboard";

describe("salesRepDashboardPeriodSchema", () => {
	it("accepts a bounded reporting period", () => {
		expect(
			salesRepDashboardPeriodSchema.parse({
				from: "2026-07-01",
				to: "2026-07-30",
			}),
		).toEqual({
			from: "2026-07-01",
			to: "2026-07-30",
		});
	});

	it("does not expose a client-controlled sales rep scope", () => {
		expect(
			salesRepDashboardPeriodSchema.parse({
				from: "2026-07-01",
				to: "2026-07-30",
				salesRepIds: [999],
			}),
		).toEqual({
			from: "2026-07-01",
			to: "2026-07-30",
		});
	});

	it("rejects ambiguous date formats", () => {
		expect(() =>
			salesRepDashboardPeriodSchema.parse({
				from: "07/01/2026",
				to: "07/30/2026",
			}),
		).toThrow();
	});
});
