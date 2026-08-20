import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("customer statement download route", () => {
	it("allows enough time for synchronous PDF generation", () => {
		expect(source).toContain("export const maxDuration = 60;");
	});
});
