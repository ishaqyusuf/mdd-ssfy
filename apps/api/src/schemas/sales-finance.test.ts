import { describe, expect, it } from "bun:test";

import {
	salesFinanceAnalyticsSchema,
	salesFinanceReportSchema,
	salesFinanceSummarySchema,
	salesFinanceTransactionsSchema,
} from "./sales-finance";

describe("Sales Finance date-only API contract", () => {
	it("accepts one normalized date population for table, summary, analytics, and report", () => {
		const filters = {
			from: "2026-03-01",
			to: "2026-08-31",
			tab: "all" as const,
		};

		expect(
			salesFinanceTransactionsSchema.safeParse({ ...filters, size: 50 })
				.success,
		).toBe(true);
		expect(salesFinanceSummarySchema.safeParse(filters).success).toBe(true);
		expect(salesFinanceAnalyticsSchema.safeParse(filters).success).toBe(true);
		expect(
			salesFinanceReportSchema.safeParse({
				...filters,
				reportType: "payments",
			}).success,
		).toBe(true);
	});

	it("rejects an unnormalized relative preset in every affected API field", () => {
		const filters = { from: "last 6 months", to: "2026-08-31", tab: "all" };

		expect(salesFinanceTransactionsSchema.safeParse(filters).success).toBe(
			false,
		);
		expect(salesFinanceSummarySchema.safeParse(filters).success).toBe(false);
		expect(salesFinanceAnalyticsSchema.safeParse(filters).success).toBe(false);
		expect(
			salesFinanceReportSchema.safeParse({
				...filters,
				reportType: "payments",
			}).success,
		).toBe(false);
	});
});
