import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./new-sales-form.tsx", import.meta.url),
	"utf8",
);

describe("Dashboard unpriced HPT save guard", () => {
	it("pauses autosave while quantity-bearing unpriced rows exist", () => {
		expect(source.includes("!hasQuantityBearingUnpricedHptRows(record)")).toBe(
			true,
		);
	});

	it("routes Draft, Final, Close, and New through the guarded save path", () => {
		for (const intent of ["draft", "final", "close", "new"]) {
			expect(source.includes(`runRequestedSave("${intent}")`)).toBe(true);
		}
		expect(source.includes("setPendingUnpricedSaveIntent(intent)")).toBe(true);
		expect(
			source.includes("void runRequestedSave(intent, sanitized, true)"),
		).toBe(true);
		expect(source.includes("resolveUnpricedHptPersistence(")).toBe(true);
	});

	it("blocks print, PDF, and preview before their direct persistence flushes", () => {
		for (const kind of [
			'kind: "print"',
			'kind: "download-pdf"',
			'kind: "preview"',
		]) {
			expect(source.includes(kind)).toBe(true);
		}
		expect(source.includes('title: "Unpriced HPT sizes"')).toBe(true);
		expect(
			source.includes(
				"Save the form and remove unpriced sizes before printing.",
			),
		).toBe(true);
	});
});
