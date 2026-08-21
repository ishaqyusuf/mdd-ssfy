import { describe, expect, it } from "bun:test";
import {
	FILTER_OPTION_COLORS,
	getStatusFilterOptionColor,
} from "@gnd/utils/filter-option-colors";

import {
	getDispatchFilters,
	getInventoryFilters,
	projectUnitFilters,
} from "./filters";

describe("filter color metadata", () => {
	it("returns semantic colors for dispatch statuses", async () => {
		const filters = await getDispatchFilters({} as never);
		const statusFilter = filters.find((filter) => filter.value === "status");

		expect(statusFilter?.options).toContainEqual({
			label: "in progress",
			value: "in progress",
			color: FILTER_OPTION_COLORS.blue,
		});
		expect(statusFilter?.options).toContainEqual({
			label: "packing queue",
			value: "packing queue",
			color: FILTER_OPTION_COLORS.amber,
		});
		expect(statusFilter?.options).toContainEqual({
			label: "cancelled",
			value: "cancelled",
			color: FILTER_OPTION_COLORS.rose,
		});
	});

	it("returns stable colors for inventory categories", async () => {
		const filters = await getInventoryFilters({
			db: {
				inventoryCategory: {
					findMany: async () => [
						{
							id: 7,
							title: "Exterior Doors",
							_count: { inventories: 3 },
						},
					],
				},
			},
		} as never);
		const categoryFilter = filters.find(
			(filter) => filter.value === "categoryId",
		);
		const category = categoryFilter?.options?.[0];

		expect(category?.label).toBe("Exterior Doors");
		expect(category?.value).toBe(7);
		expect(category?.color).toMatch(/^#[0-9a-f]{6}$/i);
		expect(category?.color).not.toBe(getStatusFilterOptionColor("unknown"));
	});

	it("leaves custom production controls uncolored", async () => {
		const filters = await projectUnitFilters({
			db: {
				builders: { findMany: async () => [] },
				projects: { findMany: async () => [] },
			},
		} as never);
		const production = filters.find(
			(filter) => filter.value === "production",
		);
		const sort = production?.options?.find((option) => option.value === "sort");

		expect(sort).toEqual({ label: "sort", value: "sort" });
	});
});
