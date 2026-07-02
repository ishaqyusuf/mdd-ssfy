import { describe, expect, it } from "bun:test";

import {
	getProductionTabItemCount,
	getProductionTabItems,
} from "./production-items";

describe("production tab items", () => {
	it("counts only production-capable result rows", () => {
		const items = [
			{ id: "door", itemConfig: { production: true } },
			{ id: "service", itemConfig: { production: false } },
			{ id: "missing-config" },
			null,
		];

		expect(getProductionTabItems(items).map((item) => item?.id)).toEqual([
			"door",
		]);
		expect(getProductionTabItemCount(items)).toBe(1);
	});

	it("returns zero for empty overview results", () => {
		expect(getProductionTabItemCount()).toBe(0);
		expect(getProductionTabItemCount(null)).toBe(0);
		expect(getProductionTabItemCount([])).toBe(0);
	});
});
