import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import {
	SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
	type SalesWorkflowCatalogCacheInput,
	type SalesWorkflowCatalogSnapshot,
	buildSalesWorkflowCatalogCacheKey,
} from "@gnd/cache/sales-workflow-catalog-cache";
import {
	type SalesWorkflowCatalogSnapshotStore,
	getCachedSalesFormComponentUsageRanks,
	getSalesFormCatalog,
	getSalesFormComponentUsageRanks,
	getVersionedSalesWorkflowCatalogSnapshot,
	searchSalesFormCustomComponents,
} from "./new-sales-form-catalog";

type TestSnapshot = SalesWorkflowCatalogSnapshot<string[]>;

const context = { db: {} } as unknown as TRPCContext;
const selector = { stepId: 51 };

class MemoryStore implements SalesWorkflowCatalogSnapshotStore {
	values = new Map<string, TestSnapshot>();
	getCalls = 0;
	setCalls = 0;
	failGet = false;
	failSet = false;

	async get<T>(
		input: SalesWorkflowCatalogCacheInput,
	): Promise<SalesWorkflowCatalogSnapshot<T> | undefined> {
		this.getCalls += 1;
		if (this.failGet) throw new Error("redis unavailable");
		return this.values.get(buildSalesWorkflowCatalogCacheKey(input)) as
			| SalesWorkflowCatalogSnapshot<T>
			| undefined;
	}

	async set<T>(
		input: SalesWorkflowCatalogCacheInput,
		snapshot: SalesWorkflowCatalogSnapshot<T>,
	): Promise<void> {
		this.setCalls += 1;
		if (this.failSet) throw new Error("redis unavailable");
		this.values.set(
			buildSalesWorkflowCatalogCacheKey(input),
			snapshot as TestSnapshot,
		);
	}
}

function revisionReader(revisions: number[]) {
	let last = revisions[0] ?? 0;
	return async () => {
		const next = revisions.shift();
		if (next !== undefined) last = next;
		return last;
	};
}

async function loadSnapshot(
	revisions: number[],
	data: string[] = ["component"],
	store = new MemoryStore(),
) {
	let loadCount = 0;
	const snapshot = await getVersionedSalesWorkflowCatalogSnapshot<string[]>(
		context,
		selector,
		"components",
		async () => {
			loadCount += 1;
			return data;
		},
		{ getRevision: revisionReader(revisions), store },
	);
	return { snapshot, store, loadCount };
}

describe("versioned sales workflow catalog snapshots", () => {
	test("separates every cache identity that can change the result", () => {
		const base: SalesWorkflowCatalogCacheInput = {
			kind: "components",
			scope: "sales",
			revision: 1,
			stepId: 1,
			stepIds: [],
		};
		const baseKey = buildSalesWorkflowCatalogCacheKey(base);
		expect(baseKey).not.toBe(
			buildSalesWorkflowCatalogCacheKey({ ...base, stepIds: [2, 1, 1] }),
		);
		expect(baseKey).not.toBe(
			buildSalesWorkflowCatalogCacheKey({ ...base, isCustom: true }),
		);
		expect(baseKey).not.toBe(
			buildSalesWorkflowCatalogCacheKey({ ...base, isCustom: false }),
		);
		expect(baseKey).not.toBe(
			buildSalesWorkflowCatalogCacheKey({ ...base, revision: 2 }),
		);
		expect(baseKey).not.toBe(
			buildSalesWorkflowCatalogCacheKey({ ...base, kind: "routing" }),
		);
		expect(
			buildSalesWorkflowCatalogCacheKey({ ...base, kind: "routing" }),
		).not.toBe(
			buildSalesWorkflowCatalogCacheKey({ ...base, kind: "routing-full" }),
		);
		expect(baseKey).not.toBe(
			buildSalesWorkflowCatalogCacheKey({ ...base, scope: "other-sales" }),
		);
	});

	test("fills a stable revision and stores the snapshot", async () => {
		const { snapshot, store, loadCount } = await loadSnapshot([1, 1]);
		expect(snapshot).toEqual({
			revision: 1,
			schemaVersion: SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
			data: ["component"],
		});
		expect(loadCount).toBe(1);
		expect(store.values.size).toBe(1);
	});

	test("returns a matching warm snapshot without loading the database", async () => {
		const store = new MemoryStore();
		const warm: TestSnapshot = {
			revision: 1,
			schemaVersion: SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
			data: ["cached"],
		};
		await store.set(
			{
				kind: "components",
				scope: "shared-sales-workflow",
				revision: 1,
				stepId: 51,
				stepIds: [],
			},
			warm,
		);
		const { snapshot, loadCount } = await loadSnapshot([1], ["fresh"], store);
		expect(snapshot.data).toEqual(["cached"]);
		expect(loadCount).toBe(0);
	});

	test("rejects a matching envelope with malformed component data", async () => {
		const store = new MemoryStore();
		await store.set(
			{
				kind: "components",
				scope: "shared-sales-workflow",
				revision: 1,
				stepId: 51,
				stepIds: [],
			},
			{
				revision: 1,
				schemaVersion: SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
				data: "corrupt" as unknown as string[],
			},
		);
		const { snapshot, loadCount } = await loadSnapshot(
			[1, 1],
			["fresh"],
			store,
		);
		expect(snapshot.data).toEqual(["fresh"]);
		expect(loadCount).toBe(1);
	});

	test("retries once and never publishes a stale revision after a write race", async () => {
		const { snapshot, store, loadCount } = await loadSnapshot([1, 2, 2]);
		expect(snapshot.revision).toBe(2);
		expect(loadCount).toBe(2);
		expect(store.values.size).toBe(1);
		const stored = [...store.values.values()][0];
		expect(stored?.revision).toBe(2);
	});

	test("fails closed after sustained revision churn", async () => {
		let loadCount = 0;
		await expect(
			getVersionedSalesWorkflowCatalogSnapshot<string[]>(
				context,
				selector,
				"components",
				async () => {
					loadCount += 1;
					return ["component"];
				},
				{
					getRevision: revisionReader([1, 2, 3]),
					store: new MemoryStore(),
				},
			),
		).rejects.toThrow("The sales catalog changed while loading");
		expect(loadCount).toBe(2);
	});

	test("coalesces simultaneous identical fills in one process", async () => {
		const store = new MemoryStore();
		let loadCount = 0;
		const [first, second] = await Promise.all([
			getVersionedSalesWorkflowCatalogSnapshot<string[]>(
				context,
				selector,
				"components",
				async () => {
					loadCount += 1;
					await Bun.sleep(5);
					return ["component"];
				},
				{ getRevision: revisionReader([1, 1]), store },
			),
			getVersionedSalesWorkflowCatalogSnapshot<string[]>(
				context,
				selector,
				"components",
				async () => {
					loadCount += 1;
					await Bun.sleep(5);
					return ["component"];
				},
				{ getRevision: revisionReader([1, 1]), store },
			),
		]);
		expect(first).toEqual(second);
		expect(loadCount).toBe(1);
		expect(store.setCalls).toBe(1);
	});

	test("caches an empty component result", async () => {
		const { snapshot, store } = await loadSnapshot([1, 1], []);
		expect(snapshot.data).toEqual([]);
		expect(store.values.size).toBe(1);
	});

	test("treats a cache read failure and cache write failure as a miss, not a catalog failure", async () => {
		const store = new MemoryStore();
		store.failGet = true;
		store.failSet = true;
		const { snapshot } = await loadSnapshot([1, 1], ["component"], store);
		expect(snapshot.data).toEqual(["component"]);
		expect(store.getCalls).toBe(1);
		expect(store.setCalls).toBe(1);
	});

	test("forced refresh reads the database without consulting or filling Redis", async () => {
		const store = new MemoryStore();
		const result = await getSalesFormCatalog(
			context,
			{ stepId: 51, fresh: true },
			{
				store,
				getRevision: revisionReader([4, 4]),
				load: async () => [],
			},
		);
		expect(result.revision).toBe(4);
		expect(result.components).toEqual([]);
		expect(store.getCalls).toBe(0);
		expect(store.setCalls).toBe(0);
	});

	test("usage ranking cache hits do not query component usage", async () => {
		let loadCalls = 0;
		const result = await getSalesFormComponentUsageRanks(context, selector, {
			getRanks: async () => [{ id: 51, statistics: 3 }],
			load: async () => {
				loadCalls += 1;
				return [];
			},
		});
		expect(result).toEqual([{ id: 51, statistics: 3 }]);
		expect(loadCalls).toBe(0);
	});

	test("routing reads usage ranks only from cache and continues on a miss or outage", async () => {
		const ranks = [{ id: 51, statistics: 3 }];
		expect(
			await getCachedSalesFormComponentUsageRanks(selector, {
				getRanks: async () => ranks,
			}),
		).toEqual(ranks);
		expect(
			await getCachedSalesFormComponentUsageRanks(selector, {
				getRanks: async () => undefined,
			}),
		).toBeUndefined();
		expect(
			await getCachedSalesFormComponentUsageRanks(selector, {
				getRanks: async () => {
					throw new Error("redis unavailable");
				},
			}),
		).toBeUndefined();
	});

	test("usage ranking cache outage falls back to DB on normal and forced reads", async () => {
		let loadCalls = 0;
		const deps = {
			getRanks: async () => {
				throw new Error("redis unavailable");
			},
			setRanks: async () => {
				throw new Error("redis unavailable");
			},
			load: async () => {
				loadCalls += 1;
				return [{ id: 51, statistics: 7 }];
			},
		};
		expect(await getSalesFormComponentUsageRanks(context, selector, deps)).toEqual([
			{ id: 51, statistics: 7 },
		]);
		expect(
			await getSalesFormComponentUsageRanks(
				context,
				{ ...selector, fresh: true },
				deps,
			),
		).toEqual([{ id: 51, statistics: 7 }]);
		expect(loadCalls).toBe(2);
	});

	test("searches custom components by case-insensitive title and limits results", async () => {
		const result = await searchSalesFormCustomComponents(
			context,
			{ stepId: 51, query: "frame" },
			{
				getRevision: async () => 4,
				load: async () =>
					[
						{ id: 1, uid: "frame-kit", title: "Frame Kit" },
						{ id: 2, uid: "frame-door", title: "FRAME DOOR" },
						{ id: 3, uid: "other", title: "Other" },
					] as never,
			},
		);
		expect(result.components.map((component) => component.uid)).toEqual([
			"frame-door",
			"frame-kit",
		]);
		expect(result.revision).toBe(4);
	});

	test("returns no custom components for a nonmatching search", async () => {
		const result = await searchSalesFormCustomComponents(
			context,
			{ stepId: 51, query: "zzz" },
			{
				getRevision: async () => 4,
				load: async () =>
					[{ id: 1, uid: "frame-kit", title: "Frame Kit" }] as never,
			},
		);
		expect(result.components).toEqual([]);
	});

	test("bounds custom search and fetches a saved selection by UID", async () => {
		const requested: Array<{
			limit?: number;
			selectedUid?: string;
			prefix?: boolean;
		}> = [];
		const result = await searchSalesFormCustomComponents(
			context,
			{ stepId: 51, query: "fr", selectedUid: "saved" },
			{
				getRevision: async () => 8,
				load: async (_ctx, _selector, options) => {
					requested.push(options || {});
					return options?.selectedUid
						? ([
								{ id: 99, uid: "saved", title: "OLD TITLE", salesPrice: 12 },
							] as never)
						: (Array.from({ length: 21 }, (_, id) => ({
								id,
								uid: `fr-${id}`,
								title: `Frame ${id}`,
							})) as never);
				},
			},
		);
		expect(requested.map(({ limit }) => limit)).toEqual([20, 1]);
		expect(requested[1]?.selectedUid).toBe("saved");
		expect(result.components).toHaveLength(20);
		expect(result.selectedComponent?.uid).toBe("saved");
	});

	test("forced usage refresh bypasses the cache and repopulates current ranks", async () => {
		let loadCalls = 0;
		let writeCalls = 0;
		let cached: Array<{ id: number; statistics: number }> | undefined = [
			{ id: 51, statistics: 99 },
		];
		const result = await getSalesFormComponentUsageRanks(
			context,
			{ ...selector, fresh: true },
			{
				getRanks: async () => cached,
				setRanks: async (_input, ranks) => {
					writeCalls += 1;
					cached = ranks;
				},
				load: async () => {
					loadCalls += 1;
					return [{ id: 51, statistics: 2 }];
				},
			},
		);
		expect(result).toEqual([{ id: 51, statistics: 2 }]);
		expect(loadCalls).toBe(1);
		expect(writeCalls).toBe(1);
		expect(cached).toEqual([{ id: 51, statistics: 2 }]);
	});
});
