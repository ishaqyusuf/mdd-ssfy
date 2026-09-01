import { describe, expect, test } from "bun:test";

import {
	getProductionConfigKey,
	getProductionItemPresentation,
	getWorkerProductionItemPresentation,
} from "./production-item-presentation";

describe("Production item presentation", () => {
	test("capitalizes the title and full subtitle value", () => {
		expect(
			getProductionItemPresentation({
				title: "H.C 2pnl square shaker primed 1-3/8",
				subtitle: "Interior pre-hung | 2-6 x 6-8 | 1 LH & 4 RH | no labor cost",
			}),
		).toEqual({
			title: "H.C 2PNL SQUARE SHAKER PRIMED 1-3/8",
			subtitle: "INTERIOR PRE-HUNG | 2-6 X 6-8 | 1 LH & 4 RH | NO LABOR COST",
		});
	});

	test("uses an uppercase fallback without inventing a subtitle", () => {
		expect(getProductionItemPresentation({})).toEqual({
			title: "UNTITLED ITEM",
			subtitle: "",
		});
	});

	test("removes the general quantity from worker subtitles", () => {
		expect(
			getWorkerProductionItemPresentation(
				{
					title: "SC hardware flush prime",
					subtitle: "Interior pre-hung | 2-6 x 6-8 | QTY: 5",
				},
				{ qty: 2 },
			),
		).toEqual({
			title: "SC HARDWARE FLUSH PRIME",
			subtitle: "INTERIOR PRE-HUNG | 2-6 X 6-8",
			assignedQuantity: { lh: 0, qty: 2, rh: 0 },
		});
	});

	test("keeps worker hand quantities out of the subtitle and in the quantity badge model", () => {
		expect(
			getWorkerProductionItemPresentation(
				{
					title: "Door",
					subtitle: "Interior pre-hung | 1 LH & 2 RH",
				},
				{ lh: 1, qty: 3, rh: 2 },
			),
		).toEqual({
			title: "DOOR",
			subtitle: "INTERIOR PRE-HUNG",
			assignedQuantity: { lh: 1, qty: 3, rh: 2 },
		});
	});

	test("disambiguates repeated production configuration rows", () => {
		const repeatedConfigs = [
			{ label: "Jamb Size", value: "4-5/8" },
			{ label: "Jamb Size", value: "4-5/8" },
		];

		const keys = repeatedConfigs.map(getProductionConfigKey);

		expect(new Set(keys).size).toBe(repeatedConfigs.length);
		expect(keys).toEqual(["Jamb Size-4-5/8-0", "Jamb Size-4-5/8-1"]);
	});
});
