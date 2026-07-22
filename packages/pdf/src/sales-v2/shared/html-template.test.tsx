/** @jsxImportSource react */
import { describe, expect, test } from "bun:test";
import type { PrintPage } from "@gnd/sales/print/types";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesHtmlTemplatePage } from "./html-template";

describe("SalesHtmlTemplatePage", () => {
	test("renders every door-table text value in uppercase without changing other sections", () => {
		const page: PrintPage = {
			meta: {
				title: "Order",
				salesNo: "12345",
				date: "07/22/2026",
				status: "pending",
				total: "$100.00",
			},
			billing: null,
			shipping: null,
			sections: [
				{
					kind: "door",
					index: 0,
					title: "Shaker Door",
					details: [{ label: "Configuration", value: "White oak" }],
					headers: [
						{ title: "Door type", key: "door", colSpan: 1 },
						{ title: "Swing", key: "swing", colSpan: 1 },
					],
					rows: [
						{
							cells: [
								{ value: "Slab", colSpan: 1 },
								{ value: "Left hand", colSpan: 1 },
							],
						},
					],
				},
				{
					kind: "moulding",
					index: 1,
					title: "Moulding profile",
					headers: [{ title: "Profile", key: "profile", colSpan: 1 }],
					rows: [{ cells: [{ value: "Crown", colSpan: 1 }] }],
				},
			],
			footer: null,
			config: {
				mode: "invoice",
				showPrices: true,
				showFooter: false,
				showPackingCol: false,
				showSignature: false,
				showImages: false,
			},
			signing: null,
		};

		const markup = renderToStaticMarkup(
			<SalesHtmlTemplatePage
				page={page}
				companyAddress={{
					address1: "Address one",
					address2: "Address two",
					phone: "555-0100",
				}}
			/>,
		);

		expect(markup).toContain("SHAKER DOOR");
		expect(markup).toContain("CONFIGURATION");
		expect(markup).toContain("WHITE OAK");
		expect(markup).toContain("DOOR TYPE");
		expect(markup).toContain("SLAB");
		expect(markup).toContain("LEFT HAND");
		expect(markup).toContain("Moulding profile");
		expect(markup).toContain("Crown");
	});
});
