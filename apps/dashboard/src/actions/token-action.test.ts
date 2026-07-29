import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("generic print token action", () => {
	it("cannot mint contractor accounting finance tokens", () => {
		const source = readFileSync(
			new URL("./token-action.ts", import.meta.url),
			"utf8",
		);
		const guard = source.indexOf(
			"data?.audience === CONTRACTOR_ACCOUNTING_PDF_AUDIENCE",
		);
		const signing = source.indexOf("return tokenize(data)");

		expect(guard).toBeGreaterThanOrEqual(0);
		expect(signing).toBeGreaterThan(guard);
	});
});
