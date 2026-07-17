import { describe, expect, it } from "bun:test";
import { getPageTabButtonVariant } from "./button-variant";

describe("getPageTabButtonVariant", () => {
	it("uses the primary button variant for the current page tab", () => {
		expect(getPageTabButtonVariant(true)).toBe("default");
		expect(getPageTabButtonVariant(false)).toBe("ghost");
	});
});
