import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

describe("packing report audit retention", () => {
	it("restricts deletion of every canonical audit identity", async () => {
		const schema = await readFile(
			new URL("../../../db/src/schema/sales.prisma", import.meta.url),
			"utf8",
		);
		const model = schema.slice(
			schema.indexOf("model SalesPackingReport"),
			schema.indexOf("model SalesHistory"),
		);
		expect(model.includes("onDelete: Cascade")).toBe(false);
		expect((model.match(/onDelete: Restrict/g) || []).length).toBe(7);
		expect(model.includes("dispatchAllocationItemId")).toBe(true);
	});
});
