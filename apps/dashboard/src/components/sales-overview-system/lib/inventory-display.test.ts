import { describe, expect, test } from "bun:test";

import {
	formatInventoryDateInputValue,
	formatInventoryExpectedDateLabel,
	formatInventoryItemSubtitle,
} from "./inventory-display";

describe("inventory display", () => {
	test("formats an inbound calendar value without a timezone shift", () => {
		expect(formatInventoryDateInputValue(new Date(2026, 7, 5))).toBe(
			"2026-08-05",
		);
	});

	test("keeps an empty or invalid inbound expected date as the placeholder", () => {
		expect(formatInventoryExpectedDateLabel("")).toBe("Expected date");
		expect(formatInventoryExpectedDateLabel("not-a-date")).toBe(
			"Expected date",
		);
	});

	test("formats the same step and variant subtitle used by Needs and inbound rows", () => {
		expect(
			formatInventoryItemSubtitle({
				stepName: "door",
				variantName: "2-6 x 6-8",
			}),
		).toBe("Door • 2-6 x 6-8");
	});

	test("normalizes raw imported door variant UIDs like w2_8-h6_8 to standard door dimensions with category", () => {
		expect(
			formatInventoryItemSubtitle({
				stepName: "door",
				variantName: "w2_8-h6_8",
			}),
		).toBe("Door • 2-8 x 6-8");
		expect(
			formatInventoryItemSubtitle({
				variantName: "w1_6-h6_8",
			}),
		).toBe("Door • 1-6 x 6-8");
	});
});
