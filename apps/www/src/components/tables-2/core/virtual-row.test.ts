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
});
