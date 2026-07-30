import { describe, expect, it } from "bun:test";
import { salesPerformanceReportSchema } from "./sales-dashboard";

describe("salesPerformanceReportSchema", () => {
	it("accepts governed report types with active sales filters", () => {
		expect(
			salesPerformanceReportSchema.parse({
				reportType: "sales-reps",
				from: "2026-07-01",
				to: "2026-07-31",
				salesRepIds: [7],
				salesChannels: ["direct"],
			}),
		).toEqual({
			reportType: "sales-reps",
			from: "2026-07-01",
			to: "2026-07-31",
			salesRepIds: [7],
			salesChannels: ["direct"],
		});
	});

	it("rejects ungoverned report names", () => {
		expect(() =>
			salesPerformanceReportSchema.parse({
				reportType: "payments-ledger",
			}),
		).toThrow();
	});
});
