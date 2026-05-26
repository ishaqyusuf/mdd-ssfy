import { describe, expect, it } from "bun:test";
import {
	normalizeShelfProductSearchQuery,
	searchShelfProductIndex,
} from "./shelf-product-search";

const products = [
	{ id: 1, title: "Ball Bearing Hinge", unitPrice: 24.5 },
	{ id: 2, title: "Mortise Lock", unitPrice: 42 },
	{ id: 3, title: "Cabinet Latch", unitPrice: 18 },
	{ id: 4, title: "Door Stop", unitPrice: 9 },
	{ id: 5, title: "Flush Bolt", unitPrice: 22 },
	{ id: 6, title: "Alpha Pull", unitPrice: 15 },
];

describe("shelf product search", () => {
	it("normalizes casing, punctuation, and repeated whitespace", () => {
		expect(normalizeShelfProductSearchQuery("  Flush--BOLT  ")).toBe(
			"flush bolt",
		);
	});

	it("returns deterministic alphabetical defaults", () => {
		expect(
			searchShelfProductIndex(products, "", { limit: 4 }).map(
				(product) => product.id,
			),
		).toEqual([6, 1, 3, 4]);
	});

	it("matches all tokens in any title position", () => {
		expect(
			searchShelfProductIndex(products, "bear hinge").map(
				(product) => product.id,
			),
		).toEqual([1]);
	});

	it("ranks starts-with and word-start matches ahead of contains matches", () => {
		const result = searchShelfProductIndex(
			[
				{ id: 1, title: "Cabinet Pull", unitPrice: 1 },
				{ id: 2, title: "Pull Plate", unitPrice: 1 },
				{ id: 3, title: "Cup Pull", unitPrice: 1 },
				{ id: 4, title: "Alpha Upull", unitPrice: 1 },
			],
			"pull",
		).map((product) => product.id);

		expect(result).toEqual([2, 1, 3, 4]);
	});

	it("keeps selected products available even outside the result limit", () => {
		expect(
			searchShelfProductIndex(products, "", {
				limit: 2,
				selectedIds: [5],
			}).map((product) => product.id),
		).toEqual([6, 1, 5]);
	});
});
