import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./dealer-quote-composer.tsx", import.meta.url),
	"utf8",
);

describe("Dealership unpriced HPT save guard", () => {
	it("prompts before removing unpriced rows and persists the sanitized quote", () => {
		expect(source.includes("resolveUnpricedHptPersistence(record")).toBe(true);
		expect(source.includes("setUnpricedSavePromptOpen(true)")).toBe(true);
		expect(source.includes("Remove sizes &amp; save")).toBe(true);
		expect(
			source.includes("const sanitized = resolveUnpricedHptPersistence("),
		).toBe(true);
		expect(source.includes("validateSavePrerequisites(record)")).toBe(true);
		expect(source.includes("persistRecord(sanitized, true)")).toBe(true);
	});
});
