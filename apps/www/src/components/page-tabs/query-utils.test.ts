import { describe, expect, it } from "bun:test";
import {
	normalizePagePath,
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

	it("includes active sort and removes pagination-only params", () => {
		const params = new URLSearchParams({
			q: "08499",
			sort: "grandTotal.desc",
			cursor: "40",
			size: "20",
			_page: "3",
		});

		expect(queryFromActiveFilters(params, { q: "08499" })).toBe(
			"q=08499&sort=grandTotal.desc",
		);
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
