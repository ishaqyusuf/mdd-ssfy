import { describe, expect, it } from "bun:test";

import {
	formatSalesDashboardDateParam,
	getSalesDashboardPeriodOptions,
} from "./use-sales-dashboard-params";

describe("Sales Dashboard period options", () => {
	it("keeps All Time anchored at the business data start", () => {
		const allTime = getSalesDashboardPeriodOptions(
			new Date("2028-06-15T12:00:00.000Z"),
		).find((period) => period.value === "all_time");

		expect(allTime?.label).toBe("All time");
		expect(
			allTime?.range.from
				? formatSalesDashboardDateParam(allTime.range.from)
				: null,
		).toBe("2016-01-01");
		expect(
			allTime?.range.to
				? formatSalesDashboardDateParam(allTime.range.to)
				: null,
		).toBe("2028-06-15");
	});
});
