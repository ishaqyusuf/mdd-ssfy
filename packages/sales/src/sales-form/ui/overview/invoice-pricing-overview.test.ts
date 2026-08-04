import { describe, expect, test } from "bun:test";

import { normalizeSalesFormGlobalAddOnDraft } from "./invoice-pricing-overview";

describe("global add-on draft", () => {
	test("normalizes a visible label and positive amount", () => {
		expect(
			normalizeSalesFormGlobalAddOnDraft("  Rush handling  ", "25.50"),
		).toEqual({
			label: "Rush handling",
			amount: 25.5,
		});
	});

	test("rejects empty labels and non-positive amounts", () => {
		expect(normalizeSalesFormGlobalAddOnDraft("", "10")).toBeNull();
		expect(normalizeSalesFormGlobalAddOnDraft("Custom Add-on", "0")).toBeNull();
		expect(
			normalizeSalesFormGlobalAddOnDraft("Custom Add-on", "not-a-number"),
		).toBeNull();
	});
});
