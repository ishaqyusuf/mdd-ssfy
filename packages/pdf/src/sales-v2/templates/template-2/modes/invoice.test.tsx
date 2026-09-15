/** @jsxImportSource react */
import { describe, expect, it } from "bun:test";
import type { PrintPage } from "@gnd/sales/print/types";
import { Children, isValidElement, type ReactNode } from "react";
import { InvoiceMode } from "./invoice";

function collectRenderedText(node: ReactNode): string[] {
	if (node == null || typeof node === "boolean") return [];
	if (typeof node === "string" || typeof node === "number") {
		return [String(node)];
	}
	if (Array.isArray(node)) return node.flatMap(collectRenderedText);
	if (!isValidElement(node)) return [];

	if (typeof node.type === "function") {
		return collectRenderedText(node.type(node.props));
	}

	return Children.toArray(node.props.children).flatMap(collectRenderedText);
}

describe("Template 2 totals-only PDF rendering", () => {
	it("renders footer and header amounts without line-price columns", () => {
		const page: PrintPage = {
			meta: {
				title: "Invoice",
				salesNo: "I-42",
				date: "09/15/2026",
				status: "pending",
				total: "$104.08",
				balanceDue: "$104.08",
			},
			billing: null,
			shipping: null,
			sections: [
				{
					kind: "line-item",
					index: 0,
					title: "Products",
					headers: [
						{ title: "Qty", key: "qty", colSpan: 1 },
						{ title: "Description", key: "description", colSpan: 4 },
					],
					rows: [
						{
							cells: [
								{ value: 2, colSpan: 1 },
								{ value: "Shaker door", colSpan: 4 },
							],
						},
					],
				},
			],
			footer: {
				notes: [],
				lines: [
					{ label: "Subtotal", value: "$94.44" },
					{ label: "Total Due", value: "$104.08", bold: true },
				],
			},
			config: {
				mode: "invoice",
				priceDisplay: "totals-only",
				showPrices: false,
				showFooter: true,
				showPackingCol: false,
				showSignature: false,
				showImages: false,
			},
			signing: null,
			specialOrder: null,
		};

		const text = collectRenderedText(
			InvoiceMode({
				page,
				companyAddress: {
					address1: "Address one",
					address2: "Address two",
					phone: "555-0100",
				},
				config: {
					pageBreakMode: "header",
					showImages: false,
					headlineFirstPage: true,
				},
			}),
		);

		expect(text).toContain("Balance Due");
		expect(text).toContain("Subtotal");
		expect(text).toContain("Total Due");
		expect(text).toContain("Shaker door");
		expect(text).not.toContain("Rate");
		expect(text).not.toContain("Total");
	});
});
