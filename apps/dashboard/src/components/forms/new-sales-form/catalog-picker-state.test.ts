import { describe, expect, test } from "bun:test";
import {
	isInitialCatalogRankingPending,
	mergeComponentsWithUsage,
} from "./catalog-picker-state";

describe("initial catalog ranking", () => {
	const readyCatalog = {
		enabled: true,
		catalogPending: false,
		catalogError: false,
		usagePending: false,
	};
	test("keeps loading through catalog then ranking and releases an empty rank result", () => {
		expect(
			isInitialCatalogRankingPending({
				...readyCatalog,
				catalogPending: true,
				usagePending: true,
			}),
		).toBe(true);
		expect(
			isInitialCatalogRankingPending({ ...readyCatalog, usagePending: true }),
		).toBe(true);
		expect(isInitialCatalogRankingPending(readyCatalog)).toBe(false);
	});
	test("does not block a disabled query or catalog failure on disabled ranks", () => {
		expect(
			isInitialCatalogRankingPending({
				...readyCatalog,
				enabled: false,
				usagePending: true,
			}),
		).toBe(false);
		expect(
			isInitialCatalogRankingPending({
				...readyCatalog,
				catalogError: true,
				usagePending: true,
			}),
		).toBe(false);
	});
	test("cached or failed ranks release the picker without waiting for a background refetch", () => {
		expect(isInitialCatalogRankingPending(readyCatalog)).toBe(false);
	});
	test("sorts by usage with deterministic ties without changing prices or source order", () => {
		const components = [
			{ id: 1, uid: "a", title: "Alpha", basePrice: 70, salesPrice: 100 },
			{ id: 2, uid: "b", title: "Beta", basePrice: 30, salesPrice: 42.86 },
			{ id: 3, uid: "c", title: "Beta", basePrice: 0, salesPrice: 0 },
		];
		const ranked = mergeComponentsWithUsage(components, [
			{ id: 2, statistics: 5 },
			{ id: 3, statistics: 5 },
		]);
		expect(ranked.map((row) => row.uid)).toEqual(["b", "c", "a"]);
		expect(ranked[2]?.basePrice).toBe(70);
		expect(ranked[2]?.salesPrice).toBe(100);
		expect(components.map((row) => row.uid)).toEqual(["a", "b", "c"]);
		expect(
			mergeComponentsWithUsage(components.slice().reverse(), []).map(
				(row) => row.uid,
			),
		).toEqual(["a", "b", "c"]);
	});
});
