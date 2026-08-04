import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("sales form adoption admin controls", () => {
	const source = readFileSync(
		new URL("./sales-form-adoption-page.tsx", import.meta.url),
		"utf8",
	);

	it("offers a confirmed bulk move only when legacy preferences exist", () => {
		expect(source.includes("Move legacy users to new form")).toBe(true);
		expect(source.includes("<AlertDialog")).toBe(true);
		expect(source.includes("!data.summary.explicitLegacy")).toBe(true);
		expect(source.includes("resetLegacyPreferences.mutate()")).toBe(true);
	});

	it("explains when the reset takes effect and remains reversible", () => {
		expect(source.includes("normal create and edit links")).toBe(true);
		expect(source.includes("One-time legacy links")).toBe(true);
		expect(source.includes("choosing legacy again remain available")).toBe(
			true,
		);
	});
});
