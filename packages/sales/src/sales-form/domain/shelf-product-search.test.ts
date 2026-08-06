import { describe, expect, it } from "bun:test";
import {
	compileShelfProductSearchIndex,
	normalizeShelfProductSearchQuery,
	searchCompiledShelfProductIndex,
	searchShelfProductIndex,
	shelfProductSearchCandidateTerms,
	shelfProductSearchCandidateTitleAnchorGroups,
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

	it("builds bounded database candidate terms without the x connector", () => {
		expect(
			shelfProductSearchCandidateTerms("frame door 4-9 3 0 x 8 0"),
		).toEqual(["frame", "door", "4", "9", "3", "0", "8"]);
	});

	it("builds grouped database anchors for each structured measurement", () => {
		const groups = shelfProductSearchCandidateTitleAnchorGroups(
			"frame 3 0 x 8 0 4-9",
		);
		expect(groups).toHaveLength(2);
		expect(groups[0]).toContain("3 0x8 0");
		expect(groups[1]).toContain("4-9");
	});

	it("builds width, height, and fraction anchors for partial measurements", () => {
		const groups = shelfProductSearchCandidateTitleAnchorGroups(
			"carrara hc 5-0",
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toContain("5-0");
		expect(groups[0]).toContain("5 0/");
		expect(groups[0]).toContain("5 0x");
		expect(groups[0]).toContain("x5 0");
		expect(groups[0]).toContain("5’0”");
	});

	it("does not treat standalone connectors or one-letter text as fuzzy terms", () => {
		for (const query of ["x", "X", "×", "a"]) {
			expect(
				searchShelfProductIndex([{ id: 1, title: "Alpha Exterior Door" }], query),
			).toEqual([]);
		}
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

	it("ranks a contiguous mid-title phrase above unordered title words", () => {
		expect(
			searchShelfProductIndex(
				[
					{ id: 1, title: "Alpha Door Bracket Frame" },
					{ id: 2, title: "Zulu Door Frame Kit" },
				],
				"door frame",
			).map((product) => product.id),
		).toEqual([2, 1]);
	});

	it("keeps selected products available even outside the result limit", () => {
		expect(
			searchShelfProductIndex(products, "", {
				limit: 2,
				selectedIds: [5],
			}).map((product) => product.id),
		).toEqual([6, 1, 5]);
	});

	it("matches reordered product words and structured door measurements", () => {
		const pocketDoorFrame = {
			id: 10,
			title: "3 0X8 0 POCKET DOOR FRAME BUILT UP 4-9/16",
			unitPrice: 145,
			categoryPath: [{ id: 4, name: "Pocket Door Frames" }],
		};

		for (const query of [
			"frame door 4-9 3 0 x 8 0",
			"DOOR frame 3-0 X 8-0 4 9/16",
			"pocket frame 4-9 3'0\" × 8'0\"",
		]) {
			expect(searchShelfProductIndex([pocketDoorFrame], query)).toEqual([
				pocketDoorFrame,
			]);
		}
	});

	it("does not satisfy structured measurements with unrelated digits", () => {
		const intended = {
			id: 10,
			title: "3-0 X 8-0 POCKET DOOR FRAME BUILT UP 4-9/16",
		};
		const collisions = [
			{
				id: 11,
				title: "3 EXTERIOR DOOR FRAME 8 SERIES 0 GAUGE 4 BY 9",
			},
			{ id: 12, title: "3-0 X 7-0 POCKET DOOR FRAME BUILT UP 4-9/16" },
			{ id: 13, title: "3-0 X 8-0 POCKET DOOR FRAME BUILT UP 4-7/16" },
		];

		expect(
			searchShelfProductIndex(
				[intended, ...collisions],
				"frame door 4-9 3 0 x 8 0",
			).map((product) => product.id),
		).toEqual([10]);
	});

	it("matches exact partial dimension sides without loose numeric matches", () => {
		const carrara = {
			id: 30,
			title: "BFLD, 4DR 5-0X6-8 HC Carrara SM, Carton Pack",
		};
		const heightMatch = {
			id: 31,
			title: "BFLD, 4DR 3-0X5-0 HC Carrara SM, Carton Pack",
		};
		const numericCollision = {
			id: 32,
			title: "Carrara HC 5 Series 0 Gauge Carton Pack",
		};

		expect(
			searchShelfProductIndex(
				[carrara, heightMatch, numericCollision],
				"Carrara hc 5-0",
			).map((product) => product.id),
		).toEqual([31, 30]);
		expect(searchShelfProductIndex([carrara], "Carrara hc 6-8")).toEqual([
			carrara,
		]);
		expect(searchShelfProductIndex([carrara], "Carrara hc 5-1")).toEqual(
			[],
		);
		expect(searchShelfProductIndex([carrara], "Carrara hc 6-7")).toEqual(
			[],
		);
	});

	it("uses category words as secondary searchable context", () => {
		const titleMatch = {
			id: 20,
			title: "Pocket Door Frame Kit",
			categoryPath: [{ name: "Hardware" }],
		};
		const categoryAssisted = {
			id: 21,
			title: "Built Up Frame Kit",
			categoryPath: [{ name: "Pocket Door Frames" }],
		};

		expect(
			searchShelfProductIndex(
				[categoryAssisted, titleMatch],
				"pocket door frame",
			).map((product) => product.id),
		).toEqual([20, 21]);
	});

	it("can compile the product index once and reuse it across queries", () => {
		const compiled = compileShelfProductSearchIndex(products);

		expect(
			searchCompiledShelfProductIndex(compiled, "hinge bearing").map(
				(product) => product.id,
			),
		).toEqual([1]);
		expect(
			searchCompiledShelfProductIndex(compiled, "lock").map(
				(product) => product.id,
			),
		).toEqual([2]);
	});
});
