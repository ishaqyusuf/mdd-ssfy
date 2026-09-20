import { createHash } from "node:crypto";
import { createLoggerWithContext } from "@gnd/logger";
import { RedisCache } from "./redis-client";

export const SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION = 6;

const STEP_CATALOG_TTL = 24 * 60 * 60;
const CATALOG_OPERATION_TIMEOUT_MS = 75;
const PROCESS_CACHE_TTL_MS = 5 * 60_000;
const PROCESS_CACHE_LIMIT = 64;

export type SalesWorkflowCatalogCacheKind = "components" | "routing" | "routing-full" | "usage-ranks";

export type SalesWorkflowCatalogSelector = {
	stepId?: number | null;
	stepTitle?: string | null;
	stepIds?: number[] | null;
	isCustom?: boolean | null;
};

export type NormalizedSalesWorkflowCatalogSelector = {
	stepId: number | null;
	stepTitle: string | null;
	stepIds: number[];
	isCustom: boolean | null;
};

export type SalesWorkflowCatalogCacheInput = SalesWorkflowCatalogSelector & {
	kind: SalesWorkflowCatalogCacheKind;
	scope: string;
	revision: number;
};

export type SalesWorkflowCatalogSnapshot<T> = {
	revision: number;
	schemaVersion: number;
	data: T;
};

const cache = new RedisCache("sales-workflow-catalog", STEP_CATALOG_TTL);
const usageCache = new RedisCache("sales-workflow-usage-ranks", 5 * 60);
const processCache = new Map<string, { serialized: string; expiresAt: number }>();
const logger = createLoggerWithContext("sales-workflow-catalog-cache");

function recordRead(kind: SalesWorkflowCatalogCacheKind, source: "process" | "redis" | "miss", startedAt: number) {
	if (process.env.GND_SALES_CATALOG_TIMING !== "1") return;
	logger.info("Catalog cache read", {
		kind,
		source,
		durationMs: Math.round(performance.now() - startedAt),
	});
}

function getProcessCached<T>(key: string): T | undefined {
	const entry = processCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		processCache.delete(key);
		return undefined;
	}
	processCache.delete(key);
	processCache.set(key, entry);
	try {
		return JSON.parse(entry.serialized) as T;
	} catch {
		processCache.delete(key);
		return undefined;
	}
}

function setProcessCached(key: string, value: unknown) {
	try {
		const serialized = JSON.stringify(value);
		if (serialized === undefined) return;
		processCache.delete(key);
		processCache.set(key, {
			serialized,
			expiresAt: Date.now() + PROCESS_CACHE_TTL_MS,
		});
		if (processCache.size > PROCESS_CACHE_LIMIT) {
			processCache.delete(processCache.keys().next().value!);
		}
	} catch {
		// Cache serialization must never block a fresh catalog response.
	}
}

export function normalizeSalesWorkflowCatalogSelector(
	input: SalesWorkflowCatalogSelector = {},
): NormalizedSalesWorkflowCatalogSelector {
	return {
		stepId: Number.isFinite(input.stepId) ? Number(input.stepId) : null,
		stepTitle: input.stepTitle?.trim() || null,
		stepIds: Array.isArray(input.stepIds)
			? [...new Set(input.stepIds.map(Number).filter(Number.isFinite))].sort(
					(a, b) => a - b,
				)
			: [],
		isCustom: typeof input.isCustom === "boolean" ? input.isCustom : null,
	};
}

function digest(value: string) {
	return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function buildSalesWorkflowCatalogCacheKey(
	input: SalesWorkflowCatalogCacheInput,
) {
	const normalized = normalizeSalesWorkflowCatalogSelector(input);
	const identity = JSON.stringify({
		isCustom: normalized.isCustom,
		kind: input.kind,
		revision: input.revision,
		scope: input.scope,
		stepId: normalized.stepId,
		stepIds: normalized.stepIds,
		stepTitle: normalized.stepTitle,
	});
	return `v${SALES_WORKFLOW_CATALOG_CACHE_SCHEMA_VERSION}:${digest(identity)}`;
}

export async function getSalesWorkflowCatalogSnapshot<T>(
	input: SalesWorkflowCatalogCacheInput,
): Promise<SalesWorkflowCatalogSnapshot<T> | undefined> {
	const startedAt = performance.now();
	const key = buildSalesWorkflowCatalogCacheKey(input);
	const warm = getProcessCached<SalesWorkflowCatalogSnapshot<T>>(key);
	if (warm !== undefined) {
		recordRead(input.kind, "process", startedAt);
		return warm;
	}
	const snapshot = await cache.get<SalesWorkflowCatalogSnapshot<T>>(
		key,
		CATALOG_OPERATION_TIMEOUT_MS,
	);
	if (snapshot !== undefined) setProcessCached(key, snapshot);
	recordRead(input.kind, snapshot === undefined ? "miss" : "redis", startedAt);
	return snapshot;
}

export async function setSalesWorkflowCatalogSnapshot<T>(
	input: SalesWorkflowCatalogCacheInput,
	snapshot: SalesWorkflowCatalogSnapshot<T>,
): Promise<void> {
	const key = buildSalesWorkflowCatalogCacheKey(input);
	setProcessCached(key, snapshot);
	await cache.set(
		key,
		snapshot,
		STEP_CATALOG_TTL,
		CATALOG_OPERATION_TIMEOUT_MS,
	);
}

export async function getSalesWorkflowUsageRanks<T>(
	input: SalesWorkflowCatalogCacheInput,
): Promise<T | undefined> {
	const startedAt = performance.now();
	const key = buildSalesWorkflowCatalogCacheKey(input);
	const warm = getProcessCached<T>(key);
	if (warm !== undefined) {
		recordRead(input.kind, "process", startedAt);
		return warm;
	}
	const ranks = await usageCache.get<T>(key, CATALOG_OPERATION_TIMEOUT_MS);
	if (ranks !== undefined) setProcessCached(key, ranks);
	recordRead(input.kind, ranks === undefined ? "miss" : "redis", startedAt);
	return ranks;
}

export async function setSalesWorkflowUsageRanks<T>(
	input: SalesWorkflowCatalogCacheInput,
	ranks: T,
): Promise<void> {
	const key = buildSalesWorkflowCatalogCacheKey(input);
	setProcessCached(key, ranks);
	await usageCache.set(key, ranks, 5 * 60, CATALOG_OPERATION_TIMEOUT_MS);
}
