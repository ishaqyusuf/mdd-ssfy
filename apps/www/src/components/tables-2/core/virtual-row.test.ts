import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), "virtual-row.tsx"),
	"utf8",
);

describe("VirtualRow selection styling", () => {
	it("applies a subtle selected state across the row and sticky cells", () => {
		expect(
			source.includes('data-state={isSelected ? "selected" : undefined}'),
		).toBe(true);
		expect(source.includes('"data-[state=selected]:bg-muted/50"')).toBe(true);
		expect(source.includes('"group-data-[state=selected]:bg-muted/50"')).toBe(
			true,
		);
	});

	it("uses the shared semantic fill resolver and layout style", () => {
		expect(source.includes("resolveTableFillColumnId(")).toBe(true);
		expect(source.includes("getTableColumnLayoutStyle({")).toBe(true);
		expect(source.includes("columnId === resolvedFillColumnId")).toBe(true);
		expect(source.includes("isActions && !resolvedFillColumnId")).toBe(true);
		expect(source.includes("...(shouldFlex && { flex: 1 })")).toBe(false);
	});
});
