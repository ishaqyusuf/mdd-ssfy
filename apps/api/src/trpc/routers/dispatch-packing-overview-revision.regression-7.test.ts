import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./dispatch.route.ts", import.meta.url),
	"utf8",
);

describe("dispatch packing overview revision regression", () => {
	test("returns the canonical packing command revision with overview V2", () => {
		const procedure = source.slice(
			source.indexOf("dispatchOverviewV2: protectedProcedure"),
			source.indexOf("manifest: protectedProcedure"),
		);

		expect(procedure).toContain("getDispatchPackingCommandRevision(");
		expect(procedure).toContain(
			"return { ...overview, packingCommandRevision }",
		);
		expect(procedure.indexOf("await getDispatchOverviewV2")).toBeLessThan(
			procedure.indexOf("await getDispatchPackingCommandRevision"),
		);
	});
});
