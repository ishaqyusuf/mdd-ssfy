import { describe, expect, it } from "bun:test";

import { optionFilter } from "./filter";

describe("optionFilter", () => {
	it("preserves additive presentation metadata", () => {
		const result = optionFilter("status", "Status", [
			{
				label: "In progress",
				value: "in_progress",
				subLabel: "Work has started",
				color: "#2563eb",
			},
		]);

		expect(result.options).toEqual([
			{
				label: "In progress",
				value: "in_progress",
				subLabel: "Work has started",
				color: "#2563eb",
			},
		]);
	});

	it("keeps plain string options compatible", () => {
		expect(optionFilter("status", "Status", ["Pending"]).options).toEqual([
			{ label: "Pending", value: "Pending" },
		]);
	});

	it("preserves non-string option values without coercion", () => {
		const result = optionFilter("categoryId", "Category", [
			{ label: "Exterior Doors", value: 7, color: "#2563eb" },
		]);

		expect(result.options[0]?.value).toBe(7);
	});
});
