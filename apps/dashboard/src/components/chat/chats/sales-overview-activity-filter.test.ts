import { describe, expect, test } from "bun:test";
import { buildSalesOverviewActivityFilter } from "./sales-overview-activity-filter";

describe("Sales Overview activity filter", () => {
	test("matches direct sales notes and inventory lifecycle order arrays", () => {
		expect(
			buildSalesOverviewActivityFilter({
				id: 23521,
				orderId: "08651AD",
			}),
		).toEqual({
			op: "or",
			filters: [
				{ tagName: "salesId", tagValue: "23521" },
				{ tagName: "salesNo", tagValue: "08651AD" },
				{ tagName: "orderNo", tagValue: "08651AD" },
				{ tagName: "orderNos", tagValue: "08651AD" },
			],
		});
	});

	test("does not introduce empty order-number tag filters", () => {
		expect(
			buildSalesOverviewActivityFilter({
				id: 23521,
				orderId: null,
			}),
		).toEqual({
			op: "or",
			filters: [{ tagName: "salesId", tagValue: "23521" }],
		});
	});
});
