/** @jsxImportSource react */
import { describe, expect, test } from "bun:test";
import type { PrintPage } from "@gnd/sales/print/types";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesHtmlTemplatePage } from "./html-template";
import { getSpecialOrderColors } from "./special-order-colors";

const companyAddress = {
	address1: "Address one",
	address2: "Address two",
	phone: "555-0100",
};

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
			specialOrder: null,
		};

		const markup = renderToStaticMarkup(
			<SalesHtmlTemplatePage page={page} companyAddress={companyAddress} />,
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

	test("renders every customer Special Order state with policy and approved signer evidence", () => {
		for (const [status, label] of [
			["SIGNATURE_PENDING", "Signature pending"],
			["CUSTOMER_APPROVED", "Customer approved"],
			["REAPPROVAL_REQUIRED", "Reapproval required"],
			["CUSTOMER_DECLINED", "Customer declined"],
		] as const) {
			const page: PrintPage = {
				meta: {
					title: "Invoice",
					salesNo: "S-42",
					date: "08/13/2026",
					status: "pending",
					total: "$250.00",
				},
				billing: null,
				shipping: null,
				sections: [],
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
				specialOrder: {
					status,
					label,
					compact: false,
					policyTitle: "Special Order — Non-Returnable",
					policyText: "Custom items are non-returnable and non-refundable.",
					acknowledgmentText: "I reviewed the complete order.",
					policyVersion: 3,
					signerName: status === "CUSTOMER_APPROVED" ? "Customer Signer" : null,
					approvedAt:
						status === "CUSTOMER_APPROVED" ? "2026-08-13T12:00:00.000Z" : null,
					signatureUrl: null,
				},
			};
			const markup = renderToStaticMarkup(
				<SalesHtmlTemplatePage page={page} companyAddress={companyAddress} />,
			);
			expect(markup).toContain(`Special Order · ${label}`);
			expect(markup).toContain("Policy v3");
			expect(markup).toContain("non-returnable and non-refundable");
			if (status === "CUSTOMER_APPROVED") {
				expect(markup).toContain("Customer Signer");
				expect(markup).toContain(getSpecialOrderColors(status).background);
				expect(markup).toContain(getSpecialOrderColors(status).border);
			} else {
				expect(markup).toContain(getSpecialOrderColors(status).background);
				expect(markup).not.toContain(
					getSpecialOrderColors("CUSTOMER_APPROVED").background,
				);
			}
		}
	});

	test("keeps operational Special Order output compact and signature-free", () => {
		const page: PrintPage = {
			meta: {
				title: "Packing Slip",
				salesNo: "S-42",
				date: "08/13/2026",
				status: "pending",
				total: "$250.00",
			},
			billing: null,
			shipping: null,
			sections: [],
			footer: null,
			config: {
				mode: "packing-slip",
				showPrices: false,
				showFooter: false,
				showPackingCol: true,
				showSignature: false,
				showImages: false,
			},
			signing: null,
			specialOrder: {
				status: "CUSTOMER_APPROVED",
				label: "Customer approved",
				compact: true,
				policyTitle: "PRIVATE POLICY",
				policyText: "PRIVATE POLICY TEXT",
				acknowledgmentText: "PRIVATE ACKNOWLEDGMENT",
				policyVersion: 3,
				signerName: "PRIVATE SIGNER",
				approvedAt: "2026-08-13T12:00:00.000Z",
				signatureUrl: "https://private.example/signature.png",
			},
		};
		const markup = renderToStaticMarkup(
			<SalesHtmlTemplatePage page={page} companyAddress={companyAddress} />,
		);
		expect(markup).toContain("Special Order · Customer approved");
		expect(markup).not.toContain("PRIVATE POLICY");
		expect(markup).not.toContain("PRIVATE SIGNER");
		expect(markup).not.toContain("signature.png");
	});
});
