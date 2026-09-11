import { createHash } from "node:crypto";
import { RedisCache } from "./redis-client";

/**
 * This cache is deliberately separate from the structural Sales Request
 * configuration artifact. Service names come from rolling order history and
 * must be allowed to expire independently of configuration edits.
 */
export const SALES_REQUEST_SERVICE_VOCABULARY_CACHE_NAMESPACE =
	"sales-request-service-vocabulary";
export const SALES_REQUEST_SERVICE_VOCABULARY_CACHE_TTL_SECONDS = 60 * 60;
export const SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION = 1;
export const SALES_REQUEST_SERVICE_VOCABULARY_ALGORITHM_VERSION =
	"structured-service-rows-v3";
export const SALES_REQUEST_SERVICE_VOCABULARY_DEFAULT_LIMIT = 12;
export const SALES_REQUEST_SERVICE_VOCABULARY_MAX_LIMIT = 20;

export type SalesRequestServiceVocabularyCacheKey = {
	scope: string;
	algorithmVersion?: string;
	limit: number;
};

export type SalesRequestServiceVocabularyArtifact = {
	schemaVersion: typeof SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION;
	names: string[];
	generatedAt: string;
	revision: string;
};

export type SalesRequestServiceVocabularyCacheStore = {
	get: (key: string) => Promise<unknown>;
	set: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>;
};

export type SalesRequestServiceVocabularyCache = {
	get: (
		key: SalesRequestServiceVocabularyCacheKey,
	) => Promise<SalesRequestServiceVocabularyArtifact | undefined>;
	set: (
		key: SalesRequestServiceVocabularyCacheKey,
		artifact: SalesRequestServiceVocabularyArtifact,
	) => Promise<void>;
};

type NormalizedSalesRequestServiceVocabularyCacheKey =
	Required<SalesRequestServiceVocabularyCacheKey>;

let defaultStore: RedisCache | undefined;

function resolveDefaultStore(): RedisCache {
	if (!defaultStore) {
		defaultStore = new RedisCache(
			SALES_REQUEST_SERVICE_VOCABULARY_CACHE_NAMESPACE,
			SALES_REQUEST_SERVICE_VOCABULARY_CACHE_TTL_SECONDS,
		);
	}
	return defaultStore;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function assertNonEmptyString(
	name: string,
	value: unknown,
): asserts value is string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(
			`Sales request service vocabulary cache ${name} must be non-empty`,
		);
	}
}

export function normalizeSalesRequestServiceVocabularyLimit(value: unknown) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return SALES_REQUEST_SERVICE_VOCABULARY_DEFAULT_LIMIT;
	}
	return Math.min(
		SALES_REQUEST_SERVICE_VOCABULARY_MAX_LIMIT,
		Math.max(1, Math.trunc(parsed)),
	);
}

function normalizeKey(
	key: SalesRequestServiceVocabularyCacheKey,
): NormalizedSalesRequestServiceVocabularyCacheKey {
	assertNonEmptyString("scope", key.scope);
	const algorithmVersion =
		key.algorithmVersion || SALES_REQUEST_SERVICE_VOCABULARY_ALGORITHM_VERSION;
	assertNonEmptyString("algorithmVersion", algorithmVersion);
	return {
		scope: key.scope,
		algorithmVersion,
		limit: normalizeSalesRequestServiceVocabularyLimit(key.limit),
	};
}

function cacheKey(key: SalesRequestServiceVocabularyCacheKey) {
	const normalized = normalizeKey(key);
	return [
		`v${SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION}`,
		encodeURIComponent(normalized.scope),
		encodeURIComponent(normalized.algorithmVersion),
		String(normalized.limit),
	].join(":");
}

function normalizeNames(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const names: string[] = [];
	for (const entry of value) {
		if (typeof entry !== "string" || !entry) return undefined;
		if (names.includes(entry)) return undefined;
		names.push(entry);
	}
	if (names.length > SALES_REQUEST_SERVICE_VOCABULARY_MAX_LIMIT) {
		return undefined;
	}
	return names;
}

function readArtifact(
	value: unknown,
): SalesRequestServiceVocabularyArtifact | undefined {
	if (!isRecord(value)) return undefined;
	if (value.schemaVersion !== SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION)
		return undefined;
	const names = normalizeNames(value.names);
	if (!names) return undefined;
	if (typeof value.generatedAt !== "string" || !value.generatedAt)
		return undefined;
	if (typeof value.revision !== "string" || !value.revision) return undefined;
	return {
		schemaVersion: SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION,
		names,
		generatedAt: value.generatedAt,
		revision: value.revision,
	};
}

/**
 * Revision identity excludes timestamps and all historical row metadata. The
 * algorithm version is included so a rule change cannot reuse an old list.
 */
export function getSalesRequestServiceVocabularyRevision(
	names: readonly string[],
	algorithmVersion = SALES_REQUEST_SERVICE_VOCABULARY_ALGORITHM_VERSION,
) {
	assertNonEmptyString("algorithmVersion", algorithmVersion);
	return createHash("sha256")
		.update(
			JSON.stringify({
				algorithmVersion,
				names: [...names],
			}),
		)
		.digest("hex");
}

export function createSalesRequestServiceVocabularyCache(
	store?: SalesRequestServiceVocabularyCacheStore,
): SalesRequestServiceVocabularyCache {
	const resolveStore = () => store ?? resolveDefaultStore();

	return {
		async get(key) {
			const normalized = normalizeKey(key);
			const artifact = readArtifact(
				await resolveStore().get(cacheKey(normalized)),
			);
			if (!artifact || artifact.names.length > normalized.limit) {
				return undefined;
			}
			if (
				artifact.revision !==
				getSalesRequestServiceVocabularyRevision(
					artifact.names,
					normalized.algorithmVersion,
				)
			) {
				return undefined;
			}
			return artifact;
		},
		async set(key, artifact) {
			const normalized = normalizeKey(key);
			const parsed = readArtifact(artifact);
			if (!parsed) {
				throw new TypeError(
					"Sales request service vocabulary cache artifacts must contain a valid schema version, unique names, generatedAt, and revision",
				);
			}
			if (parsed.names.length > normalized.limit) {
				throw new TypeError(
					"Sales request service vocabulary cache artifacts cannot exceed their requested limit",
				);
			}
			if (
				parsed.revision !==
				getSalesRequestServiceVocabularyRevision(
					parsed.names,
					normalized.algorithmVersion,
				)
			) {
				throw new TypeError(
					"Sales request service vocabulary cache artifact revision does not match its names",
				);
			}
			await resolveStore().set(
				cacheKey(normalized),
				parsed,
				SALES_REQUEST_SERVICE_VOCABULARY_CACHE_TTL_SECONDS,
			);
		},
	};
}

export const salesRequestServiceVocabularyCache =
	createSalesRequestServiceVocabularyCache();
