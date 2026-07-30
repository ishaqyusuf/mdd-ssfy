import { describe, expect, it } from "bun:test";

import { buildSalesFormHref, resolveSalesFormSurface } from "./form-routing";

describe("sales form routing", () => {
	it("uses an explicit query mode before cached and persisted preferences", () => {
		expect(
			resolveSalesFormSurface({
				queryMode: "new",
				cookieMode: "legacy",
				databaseMode: "legacy",
			}),
		).toEqual({
			surface: "new",
			source: "query",
		});
	});

	it("falls back through cookie, database, and the new-form default", () => {
		expect(
			resolveSalesFormSurface({
				queryMode: null,
				cookieMode: "legacy",
				databaseMode: "new",
			}),
		).toEqual({ surface: "legacy", source: "cookie" });
		expect(
			resolveSalesFormSurface({
				queryMode: null,
				cookieMode: null,
				databaseMode: "legacy",
			}),
		).toEqual({ surface: "legacy", source: "database" });
		expect(
			resolveSalesFormSurface({
				queryMode: null,
				cookieMode: null,
				databaseMode: null,
			}),
		).toEqual({ surface: "new", source: "default" });
	});

	it("maps create and edit routes while preserving repeated search parameters", () => {
		const searchParams = new URLSearchParams();
		searchParams.append("dealerRequestId", "91");
		searchParams.append("tag", "one");
		searchParams.append("tag", "two");
		searchParams.set("salesFormMode", "legacy");

		expect(
			buildSalesFormHref({
				surface: "new",
				mode: "edit",
				type: "quote",
				slug: "quote-123",
				searchParams,
				queryMode: "new",
			}),
		).toBe(
			"/sales-form/edit-quote/quote-123?dealerRequestId=91&tag=one&tag=two&salesFormMode=new",
		);

		expect(
			buildSalesFormHref({
				surface: "legacy",
				mode: "create",
				type: "order",
				searchParams: new URLSearchParams("selectedCustomerId=44"),
				queryMode: null,
			}),
		).toBe("/sales-book/create-order?selectedCustomerId=44");
	});
});
