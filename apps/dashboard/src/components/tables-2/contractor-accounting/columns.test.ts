import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { TABLE_CONFIGS } from "@/utils/table-configs";

const source = readFileSync(new URL("./columns.tsx", import.meta.url), "utf8");

describe("contractor accounting ledger identity cells", () => {
	test("shows only the effective date in the date cell", () => {
		expect(source).toContain("row.original.effectiveAt");
		expect(source).not.toContain("row.original.id.slice(-8)");
	});

	test("shows only the contractor name in the contractor cell", () => {
		expect(source).toContain("row.original.contractor?.name");
		expect(source).not.toContain("row.original.contractor?.email");
		expect(source).not.toContain('"No email"');
	});

	test("uses the same compact row height as Sales Orders", () => {
		expect(TABLE_CONFIGS["contractor-accounting"].rowHeight).toBe(
			TABLE_CONFIGS["sales-orders"].rowHeight,
		);
	});
});
