import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");

describe("dispatch packing overview presentation", () => {
	test("keeps the dispatch status label visible instead of rendering a solid badge", () => {
		expect(source).toContain("<Progress.Status>");
		expect(source).not.toContain("<Progress.Status badge>");
	});

	test("uses divider-based overview sections and item rows", () => {
		expect(source).toContain('<section className="border-b pb-5">');
		expect(source).toContain('<section className="border-b py-5">');
		expect(source).toContain('<ItemGroup className="border-y">');
		expect(source).not.toContain(
			'<CardTitle className="text-base">Items</CardTitle>',
		);
	});
});
