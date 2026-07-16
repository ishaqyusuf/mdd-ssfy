import { describe, expect, it } from "bun:test";
import { queryFromActiveFilters } from "./query-utils";

describe("page tab query utils", () => {
	it("includes active sort and removes pagination-only params", () => {
		const params = new URLSearchParams({
			q: "08499",
			sort: "latestPaymentAt.desc",
			cursor: "40",
			size: "20",
			_page: "3",
		});

		expect(queryFromActiveFilters(params, { q: "08499" })).toBe(
			"q=08499&sort=latestPaymentAt.desc",
		);
	});

	it("allows sort-only page tabs", () => {
		const params = new URLSearchParams({
			sort: "latestPaymentAt.desc",
		});

		expect(queryFromActiveFilters(params, {})).toBe(
			"sort=latestPaymentAt.desc",
		);
	});
});
