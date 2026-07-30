import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const paths = [
	"../app/(clean-code)/(sales)/_common/data-actions/production-actions/item-assign-action.ts",
	"../app/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
	"../app-deps/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
];

describe("legacy production submission writers", () => {
	it("route produceable submissions through the shared review authority", () => {
		for (const path of paths) {
			const source = readFileSync(new URL(path, import.meta.url), "utf8");
			expect(source.includes("submitProductionAssignment")).toBe(true);
		}
	});
});
