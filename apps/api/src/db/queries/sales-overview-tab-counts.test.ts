import { describe, expect, test } from "bun:test";
import {
	buildSalesOverviewTabCounts,
	salesOverviewTabCountsSelect,
} from "./sales-overview-tab-counts";

describe("Sales Overview tab counts", () => {
	test("counts live dispatches and the payment rows shown in Transactions", () => {
		expect(salesOverviewTabCountsSelect.deliveries.where).toEqual({
			deletedAt: null,
		});
		expect(salesOverviewTabCountsSelect.payments.where).toEqual({
			deletedAt: null,
			OR: [{ origin: null }, { origin: { not: "square_refund" } }],
		});
	});

	test("uses total required production quantity, including already completed units", () => {
		expect(
			buildSalesOverviewTabCounts(
				{ deliveries: 2, payments: 3 },
				{
					production: {
						applicability: "required",
						state: "completed",
						requiredQty: 12,
						assignedQty: 12,
						completedQty: 12,
						assignmentIds: [7],
					},
				},
			),
		).toEqual({ productionQty: 12, transactions: 3, dispatch: 2 });
	});

	test("returns zero production when no pipeline applies", () => {
		expect(
			buildSalesOverviewTabCounts({ deliveries: 0, payments: 0 }, null),
		).toEqual({ productionQty: 0, transactions: 0, dispatch: 0 });
	});
});
