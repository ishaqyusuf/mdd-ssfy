import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("moulding calculator dismissal", () => {
	it("closes when the pointer lands outside the calculator dialog", () => {
		const source = readFileSync(
			new URL("./moulding-calculator.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("onPointerDownOutside={() => setOpened(false)}");
	});
});
