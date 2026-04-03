/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { buildPrintSalesInclude } from "./query";

describe("buildPrintSalesInclude", () => {
	it("skips financial and packing relations for production mode", () => {
		const include = buildPrintSalesInclude("production");

		expect(include.extraCosts).toBeUndefined();
		expect(include.payments).toBeUndefined();
		expect(include.taxes).toBeUndefined();
		expect(include.deliveries).toBeUndefined();
	});

	it("loads financial relations for invoice mode without packing relations", () => {
		const include = buildPrintSalesInclude("invoice");

		expect(include.extraCosts).toBe(true);
		expect(include.payments).toBeTruthy();
		expect(include.taxes).toBeTruthy();
		expect(include.deliveries).toBeUndefined();
	});

	it("loads both financial and packing relations for order-packing mode", () => {
		const include = buildPrintSalesInclude("order-packing");

		expect(include.extraCosts).toBe(true);
		expect(include.payments).toBeTruthy();
		expect(include.taxes).toBeTruthy();
		expect(include.deliveries).toBeTruthy();
	});
});
