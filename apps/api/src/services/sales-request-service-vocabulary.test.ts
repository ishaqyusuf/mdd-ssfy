import { describe, expect, test } from "bun:test";
import { createSalesRequestServiceVocabularyCache } from "@gnd/cache/sales-request-service-vocabulary-cache";
import {
	SALES_REQUEST_SERVICE_VOCABULARY_SOURCE_ORDER_LIMIT,
	type SalesRequestServiceVocabularyFindManyArgs,
	type SalesRequestServiceVocabularyOrder,
	extractSalesRequestServiceVocabulary,
	getSalesRequestServiceVocabulary,
	getSalesRequestServiceVocabularyNames,
	normalizeSalesRequestServiceName,
} from "./sales-request-service-vocabulary";

function order(
	updatedAt: string,
	lineItems: unknown[],
	legacyItems: unknown[] = [],
): SalesRequestServiceVocabularyOrder {
	return {
		id: Number(updatedAt.slice(-2)) || 1,
		createdAt: updatedAt,
		updatedAt,
		meta: {
			customer: { name: "Private customer should never cross this seam" },
			items: legacyItems,
			newSalesForm: { lineItems },
		},
		items: legacyItems.map((item) => ({ meta: item })),
	};
}

function serviceLine(...rows: unknown[]) {
	return {
		meta: {
			serviceRows: rows,
		},
	};
}

function serviceRow(service: unknown, extra: Record<string, unknown> = {}) {
	return {
		service,
		qty: 4,
		unitPrice: 999999,
		customerName: "Private customer should never cross this seam",
		...extra,
	};
}

describe("Sales Request service vocabulary extraction", () => {
	test("uses structured newSalesForm rows only and returns normalized names", () => {
		const extracted = extractSalesRequestServiceVocabulary([
			order(
				"2026-09-10T10:00:00.000Z",
				[
					serviceLine(
						serviceRow("  door   copy fee "),
						serviceRow("DELIVERY"),
						serviceRow("2-8 x 6-8 interior door"),
						serviceRow("glazing"),
					),
				],
				[{ description: "Legacy Install", rate: 25 }],
			),
			order("2026-09-09T10:00:00.000Z", [
				serviceLine(serviceRow("DOOR COPY FEE")),
			]),
		]);

		expect(extracted.names).toContain("DOOR COPY FEE");
		expect(extracted.names).not.toContain("DELIVERY");
		expect(extracted.names).not.toContain("LEGACY INSTALL");
		expect(extracted.names).not.toContain("GLAZING");
		expect(extracted.names).not.toContain("2-8 X 6-8 INTERIOR DOOR");
		expect(extracted.diagnostics.structuredRows).toBe(5);
		expect(extracted.diagnostics.excluded.transportOnly).toBe(1);
		expect(extracted.diagnostics.excluded.productOrOpening).toBe(1);
		expect(extracted.diagnostics.excluded.notRepeatedOrServiceLike).toBe(1);
	});

	test("accepts concise source-grounded service language and excludes transport-only noise", () => {
		const extracted = extractSalesRequestServiceVocabulary([
			order("2026-09-10T10:00:00.000Z", [
				serviceLine(
					serviceRow("install"),
					serviceRow("Window Installation"),
					serviceRow("delivery to customer"),
					serviceRow("freight only"),
					serviceRow("john@example.com"),
				),
			]),
		]);

		expect(extracted.names).toEqual(["INSTALL", "WINDOW INSTALLATION"]);
		expect(extracted.diagnostics.excluded.transportOnly).toBe(2);
		expect(extracted.diagnostics.excluded.privateDataLike).toBe(1);
	});

	test("rejects address-like labels and counts a service at most once per order", () => {
		const extracted = extractSalesRequestServiceVocabulary([
			order("2026-09-10T10:00:00.000Z", [
				serviceLine(
					serviceRow("Install at 123 Main Street for John Smith"),
					serviceRow("Install for John Smith"),
					serviceRow("glazing"),
					serviceRow("GLAZING"),
				),
			]),
		]);

		expect(extracted.names).toEqual([]);
		expect(extracted.diagnostics.excluded.privateDataLike).toBe(2);
		expect(extracted.diagnostics.excluded.notRepeatedOrServiceLike).toBe(1);
	});

	test("applies the default 12 limit and hard caps larger requests at 20", () => {
		const rows = Array.from({ length: 25 }, (_, index) =>
			serviceRow(`SERVICE ${String(index + 1).padStart(2, "0")}`),
		);
		const extracted = extractSalesRequestServiceVocabulary([
			order("2026-09-10T10:00:00.000Z", [serviceLine(...rows)]),
		]);
		const capped = extractSalesRequestServiceVocabulary(
			[order("2026-09-10T10:00:00.000Z", [serviceLine(...rows)])],
			{ limit: 999 },
		);

		expect(extracted.names).toHaveLength(12);
		expect(capped.names).toHaveLength(20);
		expect(capped.diagnostics.truncatedCandidates).toBe(5);
	});

	test("normalizes Unicode whitespace and casing without carrying row metadata", () => {
		expect(normalizeSalesRequestServiceName("  Install\u00a0Service ")).toBe(
			"INSTALL SERVICE",
		);
		const extracted = extractSalesRequestServiceVocabulary([
			order("2026-09-10T10:00:00.000Z", [
				serviceLine(
					serviceRow("  install\u00a0service ", {
						price: 42,
						count: 18,
						timestamp: "2026-09-10T10:00:00.000Z",
					}),
				),
			]),
		]);

		expect(extracted.names).toEqual(["INSTALL SERVICE"]);
		expect(JSON.stringify(extracted.names)).not.toContain("42");
		expect(JSON.stringify(extracted.names)).not.toContain("18");
	});
});

describe("Sales Request service vocabulary query seam", () => {
	test("reads at most 150 active orders and caches names/revision without prices", async () => {
		const rows = [
			order("2026-09-10T10:00:00.000Z", [
				serviceLine(serviceRow("Install Service")),
			]),
		];
		const calls: SalesRequestServiceVocabularyFindManyArgs[] = [];
		const db = {
			salesOrders: {
				findMany: async (args: SalesRequestServiceVocabularyFindManyArgs) => {
					calls.push(args);
					return rows;
				},
			},
		};
		const values = new Map<string, unknown>();
		const cache = createSalesRequestServiceVocabularyCache({
			get: async (key) => values.get(key),
			set: async (key, value) => {
				values.set(key, value);
			},
		});

		const first = await getSalesRequestServiceVocabulary(db, {
			cache,
			now: () => new Date("2026-09-11T10:00:00.000Z"),
		});
		rows[0] = order("2026-09-11T10:00:00.000Z", [
			serviceLine(serviceRow("Different Install Service")),
		]);
		const second = await getSalesRequestServiceVocabulary(db, { cache });

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			where: { deletedAt: null },
			select: {
				id: true,
				meta: true,
				createdAt: true,
				updatedAt: true,
				items: { where: { deletedAt: null }, select: { meta: true } },
			},
			take: SALES_REQUEST_SERVICE_VOCABULARY_SOURCE_ORDER_LIMIT,
		});
		expect(first.names).toEqual(["INSTALL SERVICE"]);
		expect(second).toEqual(first);
		expect(Object.keys(first).sort()).toEqual([
			"names",
			"revision",
			"schemaVersion",
		]);
		expect(JSON.stringify(first)).not.toContain("999999");
	});

	test("fresh authority reads bypass cache lookup and publication", async () => {
		let databaseReads = 0;
		let cacheReads = 0;
		let cacheWrites = 0;
		const result = await getSalesRequestServiceVocabulary(
			{
				salesOrders: {
					findMany: async () => {
						databaseReads += 1;
						return [
							order("2026-09-13T10:00:00.000Z", [
								serviceLine(serviceRow("Install Service")),
							]),
						];
					},
				},
			},
			{
				fresh: true,
				cache: {
					get: async () => {
						cacheReads += 1;
						return undefined;
					},
					set: async () => {
						cacheWrites += 1;
					},
				},
			},
		);

		expect(result.names).toEqual(["INSTALL SERVICE"]);
		expect({ databaseReads, cacheReads, cacheWrites }).toEqual({
			databaseReads: 1,
			cacheReads: 0,
			cacheWrites: 0,
		});
	});

	test("returns names-only output through the callable names seam", async () => {
		const db = {
			salesOrders: {
				findMany: async () => [
					order("2026-09-10T10:00:00.000Z", [
						serviceLine(serviceRow("Install Service")),
					]),
				],
			},
		};
		const names = await getSalesRequestServiceVocabularyNames(db, {
			cache: createSalesRequestServiceVocabularyCache({
				get: async () => undefined,
				set: async () => undefined,
			}),
		});

		expect(names).toEqual(["INSTALL SERVICE"]);
	});

	test("treats cache read and write failures as bounded database fallback", async () => {
		let reads = 0;
		const db = {
			salesOrders: {
				findMany: async () => {
					reads += 1;
					return [
						order("2026-09-10T10:00:00.000Z", [
							serviceLine(serviceRow("Install Service")),
						]),
					];
				},
			},
		};
		const result = await getSalesRequestServiceVocabulary(db, {
			cache: {
				get: async () => {
					throw new Error("cache unavailable");
				},
				set: async () => {
					throw new Error("cache unavailable");
				},
			},
		});

		expect(reads).toBe(1);
		expect(result.names).toEqual(["INSTALL SERVICE"]);
	});
});
