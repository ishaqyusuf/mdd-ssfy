import { RedisCache } from "./redis-client";

export const SALES_REQUEST_CONFIGURATION_CACHE_NAMESPACE =
	"sales-request-configuration";
export const SALES_REQUEST_CONFIGURATION_CACHE_TTL_SECONDS = 24 * 60 * 60;

export type SalesRequestConfigurationArtifact = {
	scope: string;
	revision: string;
	content: string;
};

export type SalesRequestConfigurationCacheKey = Pick<
	SalesRequestConfigurationArtifact,
	"scope" | "revision"
>;

export type SalesRequestConfigurationCacheStore = {
	get: (key: string) => Promise<unknown>;
	set: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>;
};

export type SalesRequestConfigurationCache = {
	get: {
		(
			key: SalesRequestConfigurationCacheKey,
		): Promise<SalesRequestConfigurationArtifact | undefined>;
		(
			scope: string,
			revision: string,
		): Promise<SalesRequestConfigurationArtifact | undefined>;
	};
	set: (artifact: SalesRequestConfigurationArtifact) => Promise<void>;
};

let defaultStore: RedisCache | undefined;

function resolveDefaultStore(): RedisCache {
	if (!defaultStore) {
		defaultStore = new RedisCache(
			SALES_REQUEST_CONFIGURATION_CACHE_NAMESPACE,
			SALES_REQUEST_CONFIGURATION_CACHE_TTL_SECONDS,
		);
	}
	return defaultStore;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function assertKeyPart(name: string, value: unknown): asserts value is string {
	if (typeof value !== "string" || value.length === 0)
		throw new TypeError(
			`Sales request configuration cache ${name} must be non-empty`,
		);
}

function normalizeKey(
	scopeOrKey: SalesRequestConfigurationCacheKey | string,
	revision?: string,
): SalesRequestConfigurationCacheKey {
	const scope = typeof scopeOrKey === "string" ? scopeOrKey : scopeOrKey.scope;
	const normalizedRevision =
		typeof scopeOrKey === "string" ? revision : scopeOrKey.revision;
	assertKeyPart("scope", scope);
	assertKeyPart("revision", normalizedRevision);
	return { scope, revision: normalizedRevision };
}

/** Encode each identity independently so delimiters in scopes cannot collide. */
function artifactKey({
	scope,
	revision,
}: SalesRequestConfigurationCacheKey): string {
	return `v1:${encodeURIComponent(scope)}:${encodeURIComponent(revision)}`;
}

function readArtifact(
	value: unknown,
): SalesRequestConfigurationArtifact | undefined {
	if (!isRecord(value)) return undefined;
	const keys = Object.keys(value);
	if (
		keys.length !== 3 ||
		!keys.includes("scope") ||
		!keys.includes("revision") ||
		!keys.includes("content")
	)
		return undefined;

	const { scope, revision, content } = value;
	if (
		typeof scope !== "string" ||
		typeof revision !== "string" ||
		typeof content !== "string" ||
		scope.length === 0 ||
		revision.length === 0
	)
		return undefined;

	return { scope, revision, content };
}

export function createSalesRequestConfigurationCache(
	store?: SalesRequestConfigurationCacheStore,
): SalesRequestConfigurationCache {
	const resolveStore = () => store ?? resolveDefaultStore();

	async function get(
		key: SalesRequestConfigurationCacheKey,
	): Promise<SalesRequestConfigurationArtifact | undefined>;
	async function get(
		scope: string,
		revision: string,
	): Promise<SalesRequestConfigurationArtifact | undefined>;
	async function get(
		scopeOrKey: SalesRequestConfigurationCacheKey | string,
		revision?: string,
	): Promise<SalesRequestConfigurationArtifact | undefined> {
		const requested = normalizeKey(scopeOrKey, revision);
		const artifact = readArtifact(
			await resolveStore().get(artifactKey(requested)),
		);
		if (
			!artifact ||
			artifact.scope !== requested.scope ||
			artifact.revision !== requested.revision
		)
			return undefined;
		return artifact;
	}

	async function set(
		artifact: SalesRequestConfigurationArtifact,
	): Promise<void> {
		const normalized = readArtifact(artifact);
		if (!normalized)
			throw new TypeError(
				"Sales request configuration cache artifacts must contain only non-empty scope/revision and string content",
			);
		await resolveStore().set(
			artifactKey(normalized),
			normalized,
			SALES_REQUEST_CONFIGURATION_CACHE_TTL_SECONDS,
		);
	}

	return { get, set };
}

export const salesRequestConfigurationCache =
	createSalesRequestConfigurationCache();
