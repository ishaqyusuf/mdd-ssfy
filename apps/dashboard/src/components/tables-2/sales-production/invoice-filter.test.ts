import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Production invoice visibility and filters", () => {
	it("renders the read-only Invoice column on admin tables and cards", () => {
		const columns = readSource(
			"components/tables-2/sales-production/columns.tsx",
		);
		const table = readSource(
			"components/tables-2/sales-production/data-table.tsx",
		);

		expect(columns).toContain('id: "invoice"');
		expect(columns).toContain('header: "Invoice"');
		expect(columns).toContain("row.original.invoice");
		expect(columns).toContain("enableSorting: false");
		expect(table).toContain('label="Invoice"');
		expect(table).toContain("workerMode ? null");
	});

	it("exposes applicable Sales Orders filters with semantic icons", () => {
		const header = readSource("components/sales-production/header.tsx");
		const filterParams = readSource(
			"hooks/use-sales-production-filter-params.ts",
		);

		for (const filterKey of [
			'"customer.name"',
			'"sales.rep"',
			'"invoice"',
			'"phone"',
			'"po"',
			'"item"',
		]) {
			expect(header).toContain(filterKey);
		}
		expect(filterParams).toContain(
			'invoice: parseAsStringLiteral(["paid", "pending"] as const)',
		);
		expect(header).toContain('icon: "tasks"');
		expect(header).toContain('icon: "calendar"');
		expect(header).toContain('icon: "products"');
		expect(header).toContain('icon: "Sort"');
	});

	it("keeps Production tabs above the search and filter toolbar", () => {
		const header = readSource("components/sales-production/header.tsx");

		expect(header).toContain('pageTabsLayout="adaptive"');
		expect(header).toContain('maxVisible={{ base: 3, lg: 7, "2xl": 7 }}');
	});
});
