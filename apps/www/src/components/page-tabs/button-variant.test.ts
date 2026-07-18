import { describe, expect, it } from "bun:test";
import {
	getPageTabButtonClassName,
	getPageTabButtonVariant,
} from "./button-variant";

describe("getPageTabButtonVariant", () => {
	it("uses the primary button variant for the current page tab", () => {
		expect(getPageTabButtonVariant(true)).toBe("default");
		expect(getPageTabButtonVariant(false)).toBe("ghost");
	});

	it("uses accessible orange colors for the active page tab", () => {
		const activeClassName = getPageTabButtonClassName(true);

		expect(activeClassName.includes("bg-orange-700")).toBe(true);
		expect(activeClassName.includes("text-white")).toBe(true);
		expect(activeClassName.includes("dark:bg-orange-500")).toBe(true);
		expect(activeClassName.includes("dark:text-orange-950")).toBe(true);
		expect(
			getPageTabButtonClassName(false).includes("text-muted-foreground"),
		).toBe(true);
	});
});
