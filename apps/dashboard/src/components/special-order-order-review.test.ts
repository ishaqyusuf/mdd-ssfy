import { describe, expect, test } from "bun:test";
import { getSpecialOrderDetailFacts } from "./special-order-order-review";

describe("Special Order customer order specifications", () => {
	test("shows prehung door swing and handed quantities", () => {
		expect(
			getSpecialOrderDetailFacts({
				dimension: "3-0 x 6-8",
				doorType: "Interior Pre-Hung Door",
				swing: "RH",
				lhQty: 0,
				rhQty: 2,
				totalQty: 2,
			}),
		).toEqual([
			{ label: "Size", value: "3-0 x 6-8" },
			{ label: "Door type", value: "Interior Pre-Hung Door" },
			{ label: "Prehung swing", value: "RH" },
			{ label: "Left-hand qty", value: "0" },
			{ label: "Right-hand qty", value: "2" },
			{ label: "Total doors", value: "2" },
		]);
	});

	test("falls back to nested metadata and shows house-package details", () => {
		expect(
			getSpecialOrderDetailFacts({
				doorType: "Interior",
				height: "6-8",
				totalDoors: 4,
				molding: { title: "WM 366 Casing" },
				meta: { swing: "LH" },
			}),
		).toEqual([
			{ label: "Door type", value: "Interior" },
			{ label: "Swing", value: "LH" },
			{ label: "Height", value: "6-8" },
			{ label: "Total doors", value: "4" },
			{ label: "Moulding", value: "WM 366 Casing" },
		]);
	});
});
