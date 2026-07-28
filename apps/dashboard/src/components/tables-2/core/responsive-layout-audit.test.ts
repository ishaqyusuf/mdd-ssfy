import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	TABLE_CONFIGS,
	TABLE_FILL_COLUMN_IDS,
} from "../../../utils/table-configs";

const coreDirectory = dirname(fileURLToPath(import.meta.url));
const tablesDirectory = resolve(coreDirectory, "..");
const salesFormDirectory = resolve(tablesDirectory, "../forms/sales-form");
const inventoryItemTableIds = new Set([
	"inventory-item-variants",
	"inventory-item-stocks",
	"inventory-item-movements",
	"inventory-item-inbound-demands",
	"inventory-item-allocations",
	"inventory-item-related-lines",
]);

function readSource(path: string) {
	return readFileSync(path, "utf8");
}

function coreTableDirectories() {
	return readdirSync(tablesDirectory, { withFileTypes: true })
		.filter((entry) => {
			const dataTablePath = resolve(
				tablesDirectory,
				entry.name,
				"data-table.tsx",
			);
			return (
				entry.isDirectory() &&
				existsSync(dataTablePath) &&
				readSource(dataTablePath).includes("VirtualRow")
			);
		})
		.map((entry) => entry.name);
}

describe("responsive tables-2 configuration audit", () => {
	it("registers exactly 84 core fill columns and nine legacy null entries", () => {
		const fillColumnIds = Object.values(TABLE_FILL_COLUMN_IDS);

		expect(fillColumnIds.filter(Boolean).length).toBe(84);
		expect(fillColumnIds.filter((columnId) => columnId === null).length).toBe(
			9,
		);
		expect(Object.keys(TABLE_CONFIGS).length).toBe(93);
	});

	it("keeps every sticky fill column as the final left-sticky column", () => {
		for (const config of Object.values(TABLE_CONFIGS)) {
			if (!config.fillColumnId) continue;
			const stickyIndex = config.stickyColumns.findIndex(
				(column) => column.id === config.fillColumnId,
			);
			if (stickyIndex < 0) continue;

			expect(stickyIndex).toBe(config.stickyColumns.length - 1);
		}
	});

	it("references a column declared by each table source", () => {
		for (const [tableId, fillColumnId] of Object.entries(
			TABLE_FILL_COLUMN_IDS,
		)) {
			if (!fillColumnId) continue;
			const sourceDirectory = inventoryItemTableIds.has(tableId)
				? "inventory-item-dashboard"
				: tableId;
			const source = readSource(
				resolve(tablesDirectory, sourceDirectory, "columns.tsx"),
			);

			expect(
				source.includes(`"${fillColumnId}"`) ||
					source.includes(`'${fillColumnId}'`),
			).toBe(true);
		}
	});

	it("wires every core row and header to the shared fill contract", () => {
		const directories = coreTableDirectories();

		expect(directories.length).toBe(79);
		for (const directory of directories) {
			const dataTableSource = readSource(
				resolve(tablesDirectory, directory, "data-table.tsx"),
			);
			const headerSource = readSource(
				resolve(tablesDirectory, directory, "table-header.tsx"),
			);

			expect(
				dataTableSource.includes("fillColumnId={tableConfig.fillColumnId}"),
			).toBe(true);
			expect(headerSource.includes("getTableHeaderLayoutStyle({")).toBe(true);
			expect(
				headerSource.includes(
					"preferredFillColumnId: tableConfig.fillColumnId",
				),
			).toBe(true);
		}
	});

	it("preserves the fixed-layout legacy form compatibility table", () => {
		const source = readSource(
			resolve(salesFormDirectory, "legacy-form-data-table.tsx"),
		);

		expect(source.includes('"table-fixed p-4 text-xs font-medium"')).toBe(true);
		expect(source.includes("resolveTableFillColumnId")).toBe(false);
	});
});
