import { describe, expect, it } from "bun:test";

import { middleTruncateText } from "./workflow-format";

describe("workflow format", () => {
	it("middle truncates long labels", () => {
		expect(middleTruncateText("loremipsumdoloramet", 12)).toBe("lorem...amet");
	});

	it("keeps short labels unchanged", () => {
		expect(middleTruncateText("Door", 12)).toBe("Door");
	});
});
