import { describe, expect, it } from "bun:test";

import { middleTruncateText, profileAdjustedSalesPrice } from "./workflow-format";

describe("workflow format", () => {
	it("middle truncates long labels", () => {
		expect(middleTruncateText("loremipsumdoloramet", 12)).toBe("lorem...amet");
	});

	it("keeps short labels unchanged", () => {
		expect(middleTruncateText("Door", 12)).toBe("Door");
	});

	it("derives sales price from base price and profile coefficient", () => {
		expect(profileAdjustedSalesPrice(20, 10, 2)).toBe(5);
	});
});
