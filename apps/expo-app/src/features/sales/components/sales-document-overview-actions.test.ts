import { describe, expect, it } from "bun:test";
import { getSalesDocumentOverviewMoreActions } from "./sales-document-overview-actions";

describe("mobile sales document overview more actions", () => {
	it("shows dev-only quote actions with the quote edit route", () => {
		expect(
			getSalesDocumentOverviewMoreActions({
				type: "quote",
				sale: { slug: " quote-03214lm " },
				isDev: true,
			}),
		).toEqual([
			{
				id: "edit-document",
				label: "Edit Quote",
				subtitle: "Open this quote in the sales editor",
				icon: "Pencil",
				stage: "dev",
				route: {
					pathname: "/(sales)/invoices/[slug]",
					params: { slug: "quote-03214lm", type: "quote" },
				},
			},
			{
				id: "copy",
				label: "Copy",
				subtitle: "Choose how to copy this document",
				icon: "FileText",
				stage: "dev",
			},
		]);
	});

	it("shows dev-only order actions with the order edit route", () => {
		expect(
			getSalesDocumentOverviewMoreActions({
				type: "order",
				sale: { slug: " order-08677db " },
				isDev: true,
			}),
		).toEqual([
			{
				id: "edit-document",
				label: "Edit Order",
				subtitle: "Open this order in the sales editor",
				icon: "Pencil",
				stage: "dev",
				route: {
					pathname: "/(sales)/invoices/[slug]",
					params: { slug: "order-08677db", type: "order" },
				},
			},
			{
				id: "copy",
				label: "Copy",
				subtitle: "Choose how to copy this document",
				icon: "FileText",
				stage: "dev",
			},
		]);
	});

	it("hides dev-only actions outside development builds", () => {
		expect(
			getSalesDocumentOverviewMoreActions({
				type: "order",
				sale: { slug: "order-08677db" },
				isDev: false,
			}),
		).toEqual([]);
	});

	it("omits actions when the sale has no slug", () => {
		expect(
			getSalesDocumentOverviewMoreActions({
				type: "quote",
				sale: { slug: " " },
				isDev: true,
			}),
		).toEqual([]);
	});
});
