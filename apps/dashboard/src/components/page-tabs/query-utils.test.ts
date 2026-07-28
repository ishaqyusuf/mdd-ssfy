import { describe, expect, it } from "bun:test";
import {
	buildPageTabHref,
	normalizePagePath,
	normalizeTabQuery,
	pageTabQueriesMatch,
	queryFromActiveFilters,
} from "./query-utils";

describe("page tab query utils", () => {
	it("normalizes page paths to path-only values", () => {
		expect(normalizePagePath("/sales-book/orders?sort=createdAt.desc")).toBe(
			"/sales-book/orders",
		);
		expect(normalizePagePath("/sales-book/orders/#tabs")).toBe(
			"/sales-book/orders",
		);
		expect(normalizePagePath("sales-book/orders")).toBe("/sales-book/orders");
		expect(
			normalizePagePath(
				"https://gndprodesk.localhost:3011/community/unit-invoices?bin=true#tabs",
			),
		).toBe("/community/unit-invoices");
	});

	it("includes active sort while excluding search and pagination params", () => {
		const params = new URLSearchParams({
			q: "08499",
			sort: "grandTotal.desc",
			cursor: "40",
			size: "20",
			_page: "3",
		});

		expect(queryFromActiveFilters(params, { q: "08499" })).toBe(
			"sort=grandTotal.desc",
		);
	});

	it("excludes the configured search key from saved queries", () => {
		const params = new URLSearchParams({ keyword: "oak", status: "pending" });

		expect(
			queryFromActiveFilters(
				params,
				{ keyword: "oak", status: "pending" },
				{ searchKey: "keyword" },
			),
		).toBe("status=pending");
	});

	it("treats tabName as navigation metadata and appends it to tab hrefs", () => {
		expect(
			normalizeTabQuery(
				"status=pending&tabName=Needs+review&_page=2&cursor=40",
			),
		).toBe("status=pending");
		expect(
			buildPageTabHref("/sales-book/orders", "status=pending", "Needs review"),
		).toBe("/sales-book/orders?status=pending&tabName=Needs+review");
	});

	it("allows sort-only page tabs", () => {
		const params = new URLSearchParams({
			sort: "grandTotal.desc",
		});

		expect(queryFromActiveFilters(params, {})).toBe("sort=grandTotal.desc");
	});

	it("returns an empty saved-tab query when only pagination/internal keys exist", () => {
		const params = new URLSearchParams({
			cursor: "40",
			size: "20",
			_page: "3",
		});

		expect(queryFromActiveFilters(params, {})).toBe("");
	});

	it("matches equivalent saved views regardless of key and multi-select order", () => {
		expect(
			pageTabQueriesMatch(
				"roles=sales&roles=admin&q=door&sort=createdAt.desc",
				"sort=createdAt.desc&q=door&roles=admin&roles=sales",
			),
		).toBe(true);
	});

	it("ignores pagination and empty values when matching saved views", () => {
		expect(
			pageTabQueriesMatch("q=door&_page=3&cursor=40&size=20&status=", "q=door"),
		).toBe(true);
	});

	it("rejects subset views and differences in search, sort, or value count", () => {
		expect(
			pageTabQueriesMatch("status=pending&salesRepId=7", "status=pending"),
		).toBe(false);
		expect(pageTabQueriesMatch("q=door", "q=window")).toBe(false);
		expect(
			pageTabQueriesMatch(
				"q=door&sort=createdAt.desc",
				"q=door&sort=createdAt.asc",
			),
		).toBe(false);
		expect(pageTabQueriesMatch("roles=sales&roles=sales", "roles=sales")).toBe(
			false,
		);
	});
});
