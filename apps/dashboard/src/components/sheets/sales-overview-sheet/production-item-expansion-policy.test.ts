import { describe, expect, test } from "bun:test";

import { getInitialProductionItemExpansion } from "./production-item-expansion-policy";

const itemUids = ["door-1", "door-2", "door-3"];

describe("production item expansion policy", () => {
	test("restores a valid item from the URL", () => {
		expect(
			getInitialProductionItemExpansion({
				itemUids,
				requestedItemUid: "door-2",
				singleOpen: true,
				workerMode: false,
			}),
		).toEqual(["door-2"]);
	});

	test("defaults V2 single-open mode to the first item", () => {
		expect(
			getInitialProductionItemExpansion({
				itemUids,
				requestedItemUid: null,
				singleOpen: true,
				workerMode: false,
			}),
		).toEqual(["door-1"]);
	});

	test("falls back from an invalid URL item to the first item", () => {
		expect(
			getInitialProductionItemExpansion({
				itemUids,
				requestedItemUid: "missing-door",
				singleOpen: true,
				workerMode: false,
			}),
		).toEqual(["door-1"]);
	});

	test("preserves the legacy admin collapsed default", () => {
		expect(
			getInitialProductionItemExpansion({
				itemUids,
				requestedItemUid: null,
				singleOpen: false,
				workerMode: false,
			}),
		).toEqual([]);
	});
});
