import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	patchShelfRowBasePrice,
	patchShelfRowCustomPrice,
} from "./shelf-row-products";

const source = readFileSync(
	new URL("./shelf-inline-items-editor.tsx", import.meta.url),
	"utf8",
);

describe("Shelf V2 Inline Items Price Form", () => {
	test("includes Edit Shelf Price Menu with Base Price and Custom Price form inputs", () => {
		expect(source).toContain("<Menu");
		expect(source).toContain("Edit Shelf Price");
		expect(source).toContain("Base Price");
		expect(source).toContain("Calculated Sales");
		expect(source).toContain("Custom Price");
		expect(source).toContain("patchShelfRowBasePrice(");
		expect(source).toContain("patchShelfRowCustomPrice(");
	});

	test("patchShelfRowBasePrice updates base price, calculates sales price, and respects custom price override", () => {
		const row = {
			uid: "row-1",
			productId: 1,
			description: "Shelf Item",
			qty: 2,
			basePrice: 10,
			salesPrice: 10,
			customPrice: null,
			unitPrice: 10,
			totalPrice: 20,
			meta: {},
		};

		const updated = patchShelfRowBasePrice({
			row: row as any,
			basePrice: 15,
			profileCoefficient: 1,
		});

		expect(updated.basePrice).toBe(15);
		expect(updated.salesPrice).toBe(15);
		expect(updated.unitPrice).toBe(15);
		expect(updated.totalPrice).toBe(30);

		// With custom price set, unitPrice keeps custom price override while base and sales price update
		const rowWithCustom = {
			...row,
			customPrice: 25,
			unitPrice: 25,
		};
		const updatedCustom = patchShelfRowBasePrice({
			row: rowWithCustom as any,
			basePrice: 20,
			profileCoefficient: 1,
		});

		expect(updatedCustom.basePrice).toBe(20);
		expect(updatedCustom.salesPrice).toBe(20);
		expect(updatedCustom.unitPrice).toBe(25);
		expect(updatedCustom.totalPrice).toBe(50);
	});

	test("patchShelfRowCustomPrice overrides unit price or clears custom price back to sales price", () => {
		const row = {
			uid: "row-1",
			productId: 1,
			description: "Shelf Item",
			qty: 3,
			basePrice: 10,
			salesPrice: 12,
			customPrice: null,
			unitPrice: 12,
			totalPrice: 36,
			meta: {},
		};

		const withCustom = patchShelfRowCustomPrice({
			row: row as any,
			customPrice: 18,
		});

		expect(withCustom.customPrice).toBe(18);
		expect(withCustom.unitPrice).toBe(18);
		expect(withCustom.totalPrice).toBe(54);

		const clearedCustom = patchShelfRowCustomPrice({
			row: withCustom as any,
			customPrice: null,
		});

		expect(clearedCustom.customPrice).toBe(null);
		expect(clearedCustom.unitPrice).toBe(12);
		expect(clearedCustom.totalPrice).toBe(36);
	});
});
