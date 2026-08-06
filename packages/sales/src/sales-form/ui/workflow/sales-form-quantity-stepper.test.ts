import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
	normalizeSalesFormQuantity,
	stepSalesFormQuantity,
} from "./sales-form-quantity-stepper";

describe("sales form quantity stepper", () => {
	it("increments, decrements, and respects quantity bounds", () => {
		expect(stepSalesFormQuantity(0, 1)).toBe(1);
		expect(stepSalesFormQuantity(2, -1)).toBe(1);
		expect(stepSalesFormQuantity(0, -1)).toBe(0);
		expect(stepSalesFormQuantity(5, 1, { max: 5 })).toBe(5);
		expect(normalizeSalesFormQuantity("bad", 1)).toBe(1);
	});

	it("is shared by every requested sales quantity surface", () => {
		for (const file of [
			"./modals/door-size-qty-dialog.tsx",
			"./house-package-tool-panel.tsx",
			"./moulding-line-items-editor.tsx",
			"./service-line-items-editor.tsx",
			"./shelf-inline-items-editor.tsx",
		]) {
			const source = readFileSync(new URL(file, import.meta.url), "utf8");
			expect(source).toContain("SalesFormQuantityStepper");
		}
	});

	it("keeps door sizes on one line in the desktop size column", () => {
		const source = readFileSync(
			new URL("./modals/door-size-qty-dialog.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain(
			'className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-3 shadow-sm"',
		);
		expect(source).toContain('className="whitespace-nowrap px-4 py-3"');
	});
});
