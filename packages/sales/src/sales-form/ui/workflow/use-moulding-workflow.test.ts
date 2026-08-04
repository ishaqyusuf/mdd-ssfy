import { describe, expect, test } from "bun:test";

import { mouldingRowsNeedSync } from "./use-moulding-workflow";

const storedRow = {
	uid: "moulding-1",
	title: "Baseboard",
	description: "Baseboard",
	img: null,
	qty: 3,
	addon: 0,
	customPrice: null,
	salesPrice: 12.5,
	basePrice: 10,
	estimateUnit: 14.5,
	unit: 14.5,
	lineTotal: 43.5,
};

describe("moulding workflow row synchronization", () => {
	test("settles when persisted and derived rows have the same canonical values", () => {
		expect(
			mouldingRowsNeedSync(
				[{ ...storedRow, legacyMetadata: "ignored" }],
				[{ ...storedRow, transientMetadata: "ignored" }],
			),
		).toBe(false);
	});

	test("requests synchronization when a calculated row value changes", () => {
		expect(
			mouldingRowsNeedSync(
				[storedRow],
				[{ ...storedRow, qty: 4, lineTotal: 58 }],
			),
		).toBe(true);
	});
});
