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
			"./moulding-selection-popover.tsx",
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
			'className="sticky top-0 z-10 whitespace-nowrap border-b bg-slate-50 px-2 py-1.5"',
		);
		expect(source).toContain('className="whitespace-nowrap px-2 py-1"');
	});

	it("keeps the door size dialog controls compact and divided", () => {
		const source = readFileSync(
			new URL("./modals/door-size-qty-dialog.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain(
			'className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b px-4 py-2"',
		);
		expect(source).toContain(
			'className="h-8 rounded-md bg-white text-xs font-medium"',
		);
		expect(source).toContain(
			'className="flex shrink-0 items-center justify-end gap-4 border-t bg-muted/20 px-4 py-2 text-xs"',
		);
		expect(source).toContain(
			'<table className="min-w-full table-fixed text-sm">',
		);
		expect(source.match(/<col className="w-28" \/>/g)).toHaveLength(2);
		expect(source).toContain('className="h-8 w-28 rounded-md"');
	});

	it("keeps three-digit moulding, service, and shelf quantities visible", () => {
		for (const file of [
			"./moulding-line-items-editor.tsx",
			"./service-line-items-editor.tsx",
			"./shelf-inline-items-editor.tsx",
		]) {
			const source = readFileSync(new URL(file, import.meta.url), "utf8");
			expect(source).toContain('className="w-32"');
		}

		const mouldingSource = readFileSync(
			new URL("./moulding-line-items-editor.tsx", import.meta.url),
			"utf8",
		);
		const serviceSource = readFileSync(
			new URL("./service-line-items-editor.tsx", import.meta.url),
			"utf8",
		);
		const shelfSource = readFileSync(
			new URL("./shelf-inline-items-editor.tsx", import.meta.url),
			"utf8",
		);

		expect(mouldingSource).toContain("min-w-[620px]");
		expect(serviceSource).toContain("min-w-[800px]");
		expect(serviceSource).toContain(
			'<col />\n\t\t\t\t\t\t<col style={{ width: "9.5rem" }} />',
		);
		expect(shelfSource).toContain("min-w-[820px]");
		expect(shelfSource).toContain(
			'<col style={{ width: "8rem" }} />\n\t\t\t\t\t\t<col style={{ width: "9.5rem" }} />\n\t\t\t\t\t\t<col style={{ width: "8rem" }} />',
		);
	});

	it("keeps Moulding component clicks in the quantity form with the shared stepper", () => {
		const source = readFileSync(
			new URL("./moulding-selection-popover.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("<SalesFormQuantityStepper");
		expect(source).toContain("inputRef={props.inputRef}");
		expect(source).toContain("min={1}");
		expect(source).toContain("props.onQtyChange(String(value))");
		expect(source).toContain("onInputKeyDown");
	});
});
