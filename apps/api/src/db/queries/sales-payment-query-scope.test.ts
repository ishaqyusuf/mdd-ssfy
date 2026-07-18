import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	resolve(
		dirname(fileURLToPath(import.meta.url)),
		"sales-payment-processor.ts",
	),
	"utf8",
);

describe("sales payment query scope response", () => {
	it("returns the applied sale references needed for exact invalidation", () => {
		expect(source.includes("appliedSales: [] as")).toBe(true);
		expect(
			source.includes("response.appliedSales = result.appliedSales;"),
		).toBe(true);
	});
});
