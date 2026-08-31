import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TABLE_CONFIGS } from "../../../utils/table-configs";

const coreDirectory = dirname(fileURLToPath(import.meta.url));
const tablesDirectory = resolve(coreDirectory, "..");
const sharedSelectionConfigIds: Record<string, keyof typeof TABLE_CONFIGS> = {
	"dispatch-backlog": "sales-dispatch",
};

describe("tables-2 selection column audit", () => {
	it("keeps every selection column sticky and non-reorderable", () => {
		const selectionDirectories = readdirSync(tablesDirectory, {
			withFileTypes: true,
		})
			.filter((entry) => {
				const columnsPath = resolve(tablesDirectory, entry.name, "columns.tsx");
				return (
					entry.isDirectory() &&
					existsSync(columnsPath) &&
					readFileSync(columnsPath, "utf8").includes('id: "select"')
				);
			})
			.map((entry) => entry.name);

		expect(selectionDirectories.length).toBe(24);
		for (const directory of selectionDirectories) {
			const configId =
				sharedSelectionConfigIds[directory] ??
				(directory as keyof typeof TABLE_CONFIGS);
			const config = TABLE_CONFIGS[configId];

			expect(config).toBeDefined();
			expect(
				config?.stickyColumns.some((column) => column.id === "select"),
			).toBe(true);
			expect(config?.nonReorderableColumns.has("select")).toBe(true);
		}
	});
});
