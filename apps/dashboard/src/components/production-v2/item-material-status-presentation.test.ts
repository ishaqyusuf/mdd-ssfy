import { describe, expect, it } from "bun:test";

import { getItemMaterialStatusNotice } from "./item-material-status-presentation";

describe("getItemMaterialStatusNotice", () => {
	it("uses neutral admin copy and hides no-material setup from workers", () => {
		const status = {
			code: "not_required",
			label: "NO MATERIAL NEEDED",
			tone: "neutral",
		} as const;

		expect(getItemMaterialStatusNotice(status, "admin")).toEqual({
			label: "NO MATERIAL NEEDED",
			tone: "neutral",
		});
		expect(getItemMaterialStatusNotice(status, "worker")).toBeNull();
	});

	it("keeps a technical conflict to one admin badge and one worker badge", () => {
		const status = {
			code: "material_conflict",
			label: "INVENTORY SETUP MISMATCH",
			tone: "destructive",
		} as const;

		expect(getItemMaterialStatusNotice(status, "admin")).toEqual({
			label: "INVENTORY SETUP MISMATCH",
			tone: "destructive",
		});
		expect(getItemMaterialStatusNotice(status, "worker")).toEqual({
			label: "MATERIAL NEEDED",
			tone: "warning",
		});
	});

	it("presents an uncovered Need as its exact status badge", () => {
		expect(
			getItemMaterialStatusNotice(
				{
					code: "material_shortage",
					label: "MATERIAL SHORTAGE",
					tone: "destructive",
				},
				"admin",
			),
		).toEqual({
			label: "MATERIAL SHORTAGE",
			tone: "destructive",
		});
	});
});
