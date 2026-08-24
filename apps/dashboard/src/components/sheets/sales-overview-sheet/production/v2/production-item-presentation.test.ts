import { describe, expect, test } from "bun:test";

import {
	getProductionConfigKey,
	getProductionItemPresentation,
} from "./production-item-presentation";

describe("Production item presentation", () => {
	test("capitalizes the title and full subtitle value", () => {
		expect(
			getProductionItemPresentation({
				title: "H.C 2pnl square shaker primed 1-3/8",
				subtitle:
					"Interior pre-hung | 2-6 x 6-8 | 1 LH & 4 RH | no labor cost",
			}),
		).toEqual({
			title: "H.C 2PNL SQUARE SHAKER PRIMED 1-3/8",
			subtitle:
				"INTERIOR PRE-HUNG | 2-6 X 6-8 | 1 LH & 4 RH | NO LABOR COST",
		});
	});

	test("uses an uppercase fallback without inventing a subtitle", () => {
		expect(getProductionItemPresentation({})).toEqual({
			title: "UNTITLED ITEM",
			subtitle: "",
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
