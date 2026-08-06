import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("shelf product picker", () => {
	it("keeps product search results within a scrollable height boundary", () => {
		const source = readFileSync(
			new URL("./shelf-inputs.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain('data-shelf-product-results="true"');
		expect(source).toContain(
			'className="max-h-72 overflow-y-auto overflow-x-hidden overscroll-contain p-1"',
		);
	});
});
