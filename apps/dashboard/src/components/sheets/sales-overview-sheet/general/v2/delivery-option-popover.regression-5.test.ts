import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./delivery-option-popover.tsx", import.meta.url),
	"utf8",
);

describe("delivery option toggle regression", () => {
	test("keeps the tall selector inside the viewport next to the order panel", () => {
		expect(source).toContain('side="left"');
		expect(source).toContain('align="center"');
		expect(source).toContain("collisionPadding={16}");
	});
});
