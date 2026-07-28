import { describe, expect, it } from "bun:test";

const productionFiles = [
	"./context.tsx",
	"./door-supplier-badge.tsx",
	"./moulding-and-service/qty-input.tsx",
	"../../moulding-calculator.tsx",
] as const;

describe("legacy sales form production paths", () => {
	it("do not emit raw console diagnostics during normal interactions", async () => {
		for (const file of productionFiles) {
			const source = await Bun.file(new URL(file, import.meta.url)).text();
			expect(source).not.toMatch(/console\.(log|debug|info)\s*\(/);
		}
	});
});
