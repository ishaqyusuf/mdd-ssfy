import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import { resolveSalesFinanceDateFilters } from "./use-sales-finance-filter-params";

describe("Sales Finance date filters", () => {
	it("normalizes singular and plural six-month presets for the API", () => {
		const singular = resolveSalesFinanceDateFilters({
			dateRange: ["last 6 month"],
		});
		const plural = resolveSalesFinanceDateFilters({
			dateRange: ["last 6 months"],
		});

		expect(plural).toEqual(singular);
		expect(plural.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(plural.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("preserves legacy explicit date-only parameters", () => {
		expect(
			resolveSalesFinanceDateFilters({
				dateRange: null,
				from: "2026-01-01",
				to: "2026-01-31",
			}),
		).toEqual({ from: "2026-01-01", to: "2026-01-31" });
	});

	it("feeds one normalized filter population to every finance query", () => {
		const callers = [
			[
				"../components/tables-2/sales-finance/data-table.tsx",
				"salesFinance.transactions",
			],
			["../components/sales-finance/summary.tsx", "salesFinance.summary"],
			["../components/sales-finance/insights.tsx", "salesFinance.analytics"],
			["../components/sales-finance/reports.tsx", "salesFinance.report"],
		] as const;

		for (const [path, query] of callers) {
			const source = readFileSync(new URL(path, import.meta.url), "utf8");
			expect(source).toContain("useSalesFinanceFilterParams()");
			expect(source).toContain("{ filters");
			expect(source).toContain(query);
		}
	});
});
