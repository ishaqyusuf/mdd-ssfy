import { describe, expect, it } from "bun:test";
import {
	buildSalesOrdersPerformanceEvent,
	describeSalesOrdersQuery,
	resolveSalesOrderReadModelCohort,
	salesOrderReadModelCohortPercentage,
} from "./sales-orders-performance";

describe("Sales Orders performance controls", () => {
	it("selects a stable, reversible read-model cohort", () => {
		expect(
			resolveSalesOrderReadModelCohort({
				configuredMode: "read",
				userId: 42,
				percentage: 0,
			}),
		).toMatchObject({ effectiveMode: "off", included: false });
		expect(
			resolveSalesOrderReadModelCohort({
				configuredMode: "read",
				userId: 42,
				percentage: 100,
			}),
		).toMatchObject({ effectiveMode: "read", included: true });

		const first = resolveSalesOrderReadModelCohort({
			configuredMode: "read",
			userId: 42,
			percentage: 10,
		});
		const second = resolveSalesOrderReadModelCohort({
			configuredMode: "read",
			userId: 42,
			percentage: 10,
		});
		expect(second).toEqual(first);
	});

	it("fails closed to a zero-percent cohort when no percentage is configured", () => {
		const previous = process.env.GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE;
		process.env.GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE = undefined;
		try {
			expect(salesOrderReadModelCohortPercentage()).toBe(0);
		} finally {
			if (previous === undefined) {
				process.env.GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE = undefined;
			} else {
				process.env.GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE = previous;
			}
		}
	});

	it("keeps search values and customer data out of telemetry dimensions", () => {
		const dimensions = describeSalesOrdersQuery({
			q: "APA",
			customerName: "Private Customer",
			phone: "555-0100",
			cursor: "opaque-cursor",
			size: 20,
			sort: ["createdAt.desc"],
		});

		expect(dimensions).toEqual({
			searchKind: "broad",
			activeFilters: ["customerName", "phone", "q"],
			cursorPresent: true,
			pageSize: 20,
			sortCount: 1,
		});
		expect(JSON.stringify(dimensions)).not.toContain("APA");
		expect(JSON.stringify(dimensions)).not.toContain("Private Customer");
		expect(JSON.stringify(dimensions)).not.toContain("555-0100");
	});

	it("builds one correlation-safe event with stage timings and fallback reason", () => {
		const event = buildSalesOrdersPerformanceEvent({
			procedure: "sales.getOrders",
			requestId: "request-1",
			configuredMode: "read",
			effectiveMode: "off",
			cohortPercentage: 5,
			cohortIncluded: false,
			selectedPath: "legacy",
			fallbackReason: "cohort_excluded",
			status: "ok",
			totalDurationMs: 125.444,
			stageDurationsMs: {
				count: 20.125,
				rows: 35.555,
				enrichment: 69.764,
			},
			resultSize: 20,
			query: { q: "APA", size: 20 },
		});

		expect(event).toMatchObject({
			procedure: "sales.getOrders",
			requestId: "request-1",
			selectedPath: "legacy",
			fallbackReason: "cohort_excluded",
			totalDurationMs: 125.44,
			stageDurationsMs: {
				count: 20.13,
				rows: 35.56,
				enrichment: 69.76,
			},
		});
		expect(JSON.stringify(event)).not.toContain("APA");
	});
});
