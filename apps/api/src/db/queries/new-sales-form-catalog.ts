import type { SearchNewSalesFormCustomComponentsSchema } from "@api/schemas/new-sales-form";
import type { TRPCContext } from "@api/trpc/init";
import {
	type NormalizedSalesWorkflowCatalogSelector,
	SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
	type SalesWorkflowCatalogCacheInput,
	type SalesWorkflowCatalogCacheKind,
	type SalesWorkflowCatalogSnapshot,
	buildSalesWorkflowCatalogCacheKey,
	getSalesWorkflowCatalogSnapshot,
	getSalesWorkflowUsageRanks,
	normalizeSalesWorkflowCatalogSelector,
	setSalesWorkflowCatalogSnapshot,
	setSalesWorkflowUsageRanks,
} from "@gnd/cache/sales-workflow-catalog-cache";
import {
	SALES_WORKFLOW_CATALOG_SCOPE,
	getSalesWorkflowCatalogRevision,
} from "@gnd/db/queries";
import { createLoggerWithContext } from "@gnd/logger";
import { TRPCError } from "@trpc/server";
import {
	type StepComponentData,
	getStaticStepComponentCatalog,
	getStepComponentUsageRanks,
} from "./sales-form";

const catalogLogger = createLoggerWithContext("sales-workflow-catalog");

function recordComponentPayload(
	components: StepComponentData[],
	source: "fresh" | "versioned",
) {
	if (process.env.GND_SALES_CATALOG_TIMING !== "1") return;
	try {
		catalogLogger.info("Catalog component payload", {
			source,
			rows: components.length,
			serializedBytes: Buffer.byteLength(JSON.stringify(components)),
		});
	} catch {
		// Diagnostic serialization must not affect a catalog response.
	}
}

export type SalesFormCatalogQueryInput = {
	stepId?: number | null;
	stepTitle?: string | null;
	stepIds?: number[] | null;
	isCustom?: boolean | null;
	fresh?: boolean;
};

export type SalesWorkflowCatalogSnapshotStore = {
	get<T>(
		input: SalesWorkflowCatalogCacheInput,
	): Promise<SalesWorkflowCatalogSnapshot<T> | undefined>;
	set<T>(
		input: SalesWorkflowCatalogCacheInput,
		snapshot: SalesWorkflowCatalogSnapshot<T>,
	): Promise<void>;
};

export type SalesWorkflowCatalogLoadDependencies<T> = {
	getRevision?: (db: TRPCContext["db"]) => Promise<number>;
	store?: SalesWorkflowCatalogSnapshotStore;
	load?: (
		ctx: TRPCContext,
		selector: NormalizedSalesWorkflowCatalogSelector,
	) => Promise<T>;
};

const defaultStore: SalesWorkflowCatalogSnapshotStore = {
	get: (input) => getSalesWorkflowCatalogSnapshot(input),
	set: (input, snapshot) => setSalesWorkflowCatalogSnapshot(input, snapshot),
};

const inflight = new Map<string, Promise<unknown>>();

function isCurrentSnapshot<T>(
	snapshot: SalesWorkflowCatalogSnapshot<T> | undefined,
	revision: number,
	kind: SalesWorkflowCatalogCacheKind,
): snapshot is SalesWorkflowCatalogSnapshot<T> {
	return Boolean(
		snapshot &&
			snapshot.revision === revision &&
			snapshot.schemaVersion === SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION &&
			(kind === "components"
				? Array.isArray(snapshot.data)
				: snapshot.data !== null && typeof snapshot.data === "object"),
	);
}

export async function getVersionedSalesWorkflowCatalogSnapshot<T>(
	ctx: TRPCContext,
	selector: SalesFormCatalogQueryInput,
	kind: SalesWorkflowCatalogCacheKind,
	load: (
		ctx: TRPCContext,
		selector: NormalizedSalesWorkflowCatalogSelector,
	) => Promise<T>,
	deps: SalesWorkflowCatalogLoadDependencies<T> = {},
): Promise<SalesWorkflowCatalogSnapshot<T>> {
	const store = deps.store ?? defaultStore;
	const readRevision =
		deps.getRevision ??
		(async (db: TRPCContext["db"]) =>
			getSalesWorkflowCatalogRevision(db, SALES_WORKFLOW_CATALOG_SCOPE));
	const normalized = normalizeSalesWorkflowCatalogSelector(selector);
	const initialRevision = await readRevision(ctx.db);
	const initialInput: SalesWorkflowCatalogCacheInput = {
		...normalized,
		kind,
		scope: SALES_WORKFLOW_CATALOG_SCOPE,
		revision: initialRevision,
	};
	const cacheKey = buildSalesWorkflowCatalogCacheKey(initialInput);

	let cached: SalesWorkflowCatalogSnapshot<T> | undefined;
	try {
		cached = await store.get<T>(initialInput);
	} catch (error) {
		catalogLogger.warn("Catalog cache read failed", {
			error: error instanceof Error ? error.message : String(error),
			key: cacheKey,
		});
	}
	if (isCurrentSnapshot(cached, initialRevision, kind)) return cached;

	const existingFill = inflight.get(cacheKey);
	if (existingFill)
		return existingFill as Promise<SalesWorkflowCatalogSnapshot<T>>;

	const fill = (async () => {
		let revision = initialRevision;
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const fillStartedAt = performance.now();
			const data = await load(ctx, normalized);
			const latestRevision = await readRevision(ctx.db);
			if (process.env.GND_SALES_CATALOG_TIMING === "1") {
				catalogLogger.info("Catalog DB fill", {
					kind,
					durationMs: Math.round(performance.now() - fillStartedAt),
					stableRevision: latestRevision === revision,
				});
			}
			if (latestRevision === revision) {
				const input: SalesWorkflowCatalogCacheInput = {
					...normalized,
					kind,
					scope: SALES_WORKFLOW_CATALOG_SCOPE,
					revision,
				};
				const snapshot: SalesWorkflowCatalogSnapshot<T> = {
					revision,
					schemaVersion: SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
					data,
				};
				try {
					await store.set(input, snapshot);
				} catch (error) {
					catalogLogger.warn("Catalog cache write failed", {
						error: error instanceof Error ? error.message : String(error),
						key: buildSalesWorkflowCatalogCacheKey(input),
					});
				}
				return snapshot;
			}
			revision = latestRevision;
		}

		throw new TRPCError({
			code: "CONFLICT",
			message: "The sales catalog changed while loading. Please retry.",
		});
	})();

	inflight.set(cacheKey, fill);
	try {
		return await fill;
	} finally {
		if (inflight.get(cacheKey) === fill) inflight.delete(cacheKey);
	}
}

export async function getSalesFormCatalog(
	ctx: TRPCContext,
	input: SalesFormCatalogQueryInput,
	deps: SalesWorkflowCatalogLoadDependencies<StepComponentData[]> = {},
) {
	if (input.fresh) {
		const selector = normalizeSalesWorkflowCatalogSelector(input);
		const readRevision = deps.getRevision ?? getSalesWorkflowCatalogRevision;
		const load =
			deps.load ??
			((
				loadCtx: TRPCContext,
				selected: NormalizedSalesWorkflowCatalogSelector,
			) =>
				getStaticStepComponentCatalog(loadCtx, {
					stepId: selected.stepId ?? undefined,
					stepTitle: selected.stepTitle ?? undefined,
					stepIds: selected.stepIds.length ? selected.stepIds : undefined,
					isCustom: selected.isCustom ?? undefined,
				}));
		for (let attempt = 0; attempt < 2; attempt++) {
			const revision = await readRevision(ctx.db);
			const components = await load(ctx, selector);
			if (revision === (await readRevision(ctx.db))) {
				recordComponentPayload(components, "fresh");
				return {
					revision,
					schemaVersion: SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
					components,
				};
			}
		}
		throw new TRPCError({
			code: "CONFLICT",
			message: "The sales catalog changed while loading. Please retry.",
		});
	}
	const snapshot = await getVersionedSalesWorkflowCatalogSnapshot<
		StepComponentData[]
	>(
		ctx,
		input,
		"components",
		async (loadCtx, selector) =>
			getStaticStepComponentCatalog(loadCtx, {
				stepId: selector.stepId ?? undefined,
				stepTitle: selector.stepTitle ?? undefined,
				stepIds: selector.stepIds.length ? selector.stepIds : undefined,
				isCustom: selector.isCustom ?? undefined,
			}),
		deps,
	);
	recordComponentPayload(snapshot.data, "versioned");

	return {
		revision: snapshot.revision,
		schemaVersion: snapshot.schemaVersion,
		components: snapshot.data,
	};
}

export async function getSalesFormCatalogRevisionSnapshot(ctx: TRPCContext) {
	return {
		revision: await getSalesWorkflowCatalogRevision(
			ctx.db,
			SALES_WORKFLOW_CATALOG_SCOPE,
		),
		schemaVersion: SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION,
	};
}

const inflightUsage = new Map<
	string,
	Promise<Array<{ id: number; statistics: number }>>
>();

export type SalesWorkflowUsageRankDependencies = {
	getRanks?: (
		input: SalesWorkflowCatalogCacheInput,
	) => Promise<Array<{ id: number; statistics: number }> | undefined>;
	setRanks?: (
		input: SalesWorkflowCatalogCacheInput,
		ranks: Array<{ id: number; statistics: number }>,
	) => Promise<void>;
	load?: (
		ctx: TRPCContext,
		query: {
			stepId?: number;
			stepTitle?: string;
			stepIds?: number[];
			isCustom?: boolean;
		},
	) => Promise<Array<{ id: number; statistics: number }>>;
};

export type SearchSalesFormCustomComponentsDependencies = {
	load?: (
		ctx: TRPCContext,
		selector: SalesFormCatalogQueryInput,
		options?: {
			search?: string;
			prefix?: boolean;
			limit?: number;
			selectedUid?: string;
			includeArchived?: boolean;
		},
	) => Promise<StepComponentData[]>;
	getRevision?: (db: TRPCContext["db"]) => Promise<number>;
};

export async function searchSalesFormCustomComponents(
	ctx: TRPCContext,
	input: SearchNewSalesFormCustomComponentsSchema,
	deps: SearchSalesFormCustomComponentsDependencies = {},
) {
	const query = input.query.trim().toLowerCase();
	const load =
		deps.load ??
		(async (
			loadCtx: TRPCContext,
			_selector: SalesFormCatalogQueryInput,
			options?: Parameters<typeof getStaticStepComponentCatalog>[2],
		) =>
			getStaticStepComponentCatalog(
				loadCtx,
				{
					stepId: input.stepId,
					isCustom: true,
				},
				options,
			));
	const readRevision =
		deps.getRevision ??
		((db: TRPCContext["db"]) =>
			getSalesWorkflowCatalogRevision(db, SALES_WORKFLOW_CATALOG_SCOPE));
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const revision = await readRevision(ctx.db);
		const selector = { stepId: input.stepId, isCustom: true };
		const prefix =
			query.length >= 2
				? await load(ctx, selector, {
						search: input.query.trim(),
						prefix: true,
						limit: 20,
					})
				: [];
		const remainder =
			query.length >= 2 && prefix.length < 20
				? await load(ctx, selector, { search: input.query.trim(), limit: 20 })
				: [];
		const seen = new Set<string>();
		const components = [...prefix, ...remainder]
			.filter((component) => {
				const title = String(component.title || "")
					.trim()
					.toLowerCase();
				if (component.isDeleted || !title.includes(query)) return false;
				const uid = String(component.uid || component.id);
				if (seen.has(uid)) return false;
				seen.add(uid);
				return true;
			})
			.sort((a, b) => {
				const aPrefix = String(a.title || "")
					.toLowerCase()
					.startsWith(query);
				const bPrefix = String(b.title || "")
					.toLowerCase()
					.startsWith(query);
				return (
					Number(bPrefix) - Number(aPrefix) ||
					String(a.title || "").localeCompare(String(b.title || "")) ||
					String(a.uid || "").localeCompare(String(b.uid || ""))
				);
			})
			.slice(0, 20);
		const selectedComponent = input.selectedUid
			? ((
					await load(ctx, selector, {
						selectedUid: input.selectedUid,
						includeArchived: true,
						limit: 1,
					})
				)[0] ?? null)
			: null;
		if (revision === (await readRevision(ctx.db))) {
			return { revision, components, selectedComponent };
		}
	}
	throw new TRPCError({
		code: "CONFLICT",
		message: "The sales catalog changed while searching. Please retry.",
	});
}

function usageRanksInput(selector: SalesFormCatalogQueryInput) {
	const normalized = normalizeSalesWorkflowCatalogSelector(selector);
	const input: SalesWorkflowCatalogCacheInput = {
		...normalized,
		kind: "usage-ranks",
		scope: SALES_WORKFLOW_CATALOG_SCOPE,
		revision: 0,
	};
	return { normalized, input };
}

export async function getCachedSalesFormComponentUsageRanks(
	selector: SalesFormCatalogQueryInput,
	deps: Pick<SalesWorkflowUsageRankDependencies, "getRanks"> = {},
) {
	const { input } = usageRanksInput(selector);
	try {
		const ranks = await (deps.getRanks ?? getSalesWorkflowUsageRanks)(input);
		return Array.isArray(ranks) ? ranks : undefined;
	} catch (error) {
		catalogLogger.warn("Usage ranking cache read failed", {
			error: error instanceof Error ? error.message : String(error),
			key: buildSalesWorkflowCatalogCacheKey(input),
		});
		return undefined;
	}
}

export async function getSalesFormComponentUsageRanks(
	ctx: TRPCContext,
	selector: SalesFormCatalogQueryInput,
	deps: SalesWorkflowUsageRankDependencies = {},
) {
	const { normalized, input } = usageRanksInput(selector);
	const ranksQuery = {
		stepId: normalized.stepId ?? undefined,
		stepTitle: normalized.stepTitle ?? undefined,
		stepIds: normalized.stepIds.length ? normalized.stepIds : undefined,
		isCustom: normalized.isCustom ?? undefined,
	};
	const loadRanks = deps.load ?? getStepComponentUsageRanks;
	const readRanks = deps.getRanks ?? getSalesWorkflowUsageRanks;
	const writeRanks = deps.setRanks ?? setSalesWorkflowUsageRanks;
	const saveRanks = async (ranks: Array<{ id: number; statistics: number }>) => {
		try {
			await writeRanks(input, ranks);
		} catch (error) {
			catalogLogger.warn("Usage ranking cache write failed", {
				error: error instanceof Error ? error.message : String(error),
				key: buildSalesWorkflowCatalogCacheKey(input),
			});
		}
	};
	if (selector.fresh) {
		const ranks = await loadRanks(ctx, ranksQuery);
		await saveRanks(ranks);
		return ranks;
	}
	const key = buildSalesWorkflowCatalogCacheKey(input);
	let cached: Array<{ id: number; statistics: number }> | undefined;
	try {
		cached = await readRanks(input);
	} catch (error) {
		catalogLogger.warn("Usage ranking cache read failed", {
			error: error instanceof Error ? error.message : String(error),
			key,
		});
	}
	if (Array.isArray(cached)) return cached;
	const existing = inflightUsage.get(key);
	if (existing) return existing;
	const fill = (async () => {
		const ranks = await loadRanks(ctx, ranksQuery);
		await saveRanks(ranks);
		return ranks;
	})();
	inflightUsage.set(key, fill);
	try {
		return await fill;
	} finally {
		if (inflightUsage.get(key) === fill) inflightUsage.delete(key);
	}
}
