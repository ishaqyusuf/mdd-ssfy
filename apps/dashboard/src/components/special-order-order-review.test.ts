import { describe, expect, test } from "bun:test";
import type { PrintSection } from "@gnd/sales/print/types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpecialOrderOrderReview } from "./special-order-order-review";

describe("Special Order customer order review", () => {
	test("renders canonical invoice sections with snapshot costs and totals", () => {
		const invoiceSections: PrintSection[] = [
			{
				kind: "door",
				index: 0,
				title: "Interior door",
				details: [{ label: "Bore", value: "Single bore" }],
				headers: [
					{ title: "Door", key: "door", colSpan: 4 },
					{ title: "LH", key: "lhQty", colSpan: 1.2 },
					{ title: "RH", key: "rhQty", colSpan: 1.2 },
				],
				rows: [
					{
						cells: [
							{ value: "Carrara", colSpan: 4, image: "carrara.png" },
							{ value: 1, colSpan: 1.2 },
							{ value: 2, colSpan: 1.2 },
						],
					},
				],
			},
		];
		const markup = renderToStaticMarkup(
			createElement(SpecialOrderOrderReview, {
				baseUrl: "https://gnd.test",
				order: {
					invoiceSections,
					extraCosts: [{ label: "Delivery", amount: 25 }],
					summary: {
						subTotal: 300,
						discount: 10,
						taxTotal: 17.4,
						grandTotal: 332.4,
					},
				},
			}),
		);

		expect(markup).toContain("INTERIOR DOOR");
		expect(markup).toContain("SINGLE BORE");
		expect(markup).toContain("CARRARA");
		expect(markup).toContain("carrara.png");
		expect(markup).toContain("Delivery");
		expect(markup).toContain("$332.40");
	});
});
