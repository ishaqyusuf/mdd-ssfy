import { createOpenAI } from "@ai-sdk/openai";
import { type ToolSet, tool } from "ai";
import {
	type EmbeddingCacheOptions,
	type ToolIndex,
	createToolIndex,
} from "toolpick";
import { z } from "zod";
import type { AssistantToolActor } from "./registry";
import {
	ASSISTANT_TOOL_CATALOG_VERSION,
	discoverAssistantTools,
} from "./registry";
import { ASSISTANT_MAX_SELECTED_TOOLS } from "./runtime";

type PublicAssistantTool = ReturnType<typeof discoverAssistantTools>[number];

const ASSISTANT_SELECTION_CACHE_MAX_ENTRIES = 32;
const ASSISTANT_SELECTION_CACHE_TTL_MS = 15 * 60 * 1_000;
type CacheEntry<T> = { value: T; expiresAt: number };
const indexCache = new Map<string, CacheEntry<ToolIndex>>();
const embeddingCache = new Map<string, CacheEntry<number[][]>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string) {
	const entry = cache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		cache.delete(key);
		return undefined;
	}
	cache.delete(key);
	cache.set(key, entry);
	return entry.value;
}

function setCached<T>(
	cache: Map<string, CacheEntry<T>>,
	key: string,
	value: T,
) {
	cache.delete(key);
	while (cache.size >= ASSISTANT_SELECTION_CACHE_MAX_ENTRIES) {
		const oldestKey = cache.keys().next().value;
		if (!oldestKey) break;
		cache.delete(oldestKey);
		if (cache === indexCache) embeddingCache.delete(`${oldestKey}:embeddings`);
	}
	cache.set(key, {
		value,
		expiresAt: Date.now() + ASSISTANT_SELECTION_CACHE_TTL_MS,
	});
}

function getCachedIndex(key: string) {
	const entry = indexCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		indexCache.delete(key);
		embeddingCache.delete(`${key}:embeddings`);
		return undefined;
	}
	indexCache.delete(key);
	indexCache.set(key, entry);
	return entry.value;
}

function signature(definitions: PublicAssistantTool[]) {
	return definitions
		.map((definition) => `${definition.toolId}@${definition.version}`)
		.sort()
		.join(",");
}

function metadataTools(definitions: PublicAssistantTool[]): ToolSet {
	return Object.fromEntries(
		definitions.map((definition) => [
			definition.toolId,
			tool({
				description: [
					definition.title,
					definition.description,
					`Domain: ${definition.domain}.`,
					`Effect: ${definition.effect}.`,
				].join(" "),
				inputSchema: z.object({}),
			}),
		]),
	);
}

function memoryEmbeddingCache(key: string): EmbeddingCacheOptions {
	return {
		async load() {
			return getCached(embeddingCache, key) ?? null;
		},
		async save(embeddings) {
			setCached(embeddingCache, key, embeddings);
		},
	};
}

function createEmbeddingModel(
	environment: Readonly<Record<string, string | undefined>>,
) {
	const apiKey = environment.ASSISTANT_EMBEDDING_API_KEY?.trim();
	if (!apiKey) return undefined;
	return createOpenAI({ apiKey }).embeddingModel(
		environment.ASSISTANT_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
	);
}

function getIndex(
	definitions: PublicAssistantTool[],
	environment: Readonly<Record<string, string | undefined>>,
) {
	const embeddingModel = createEmbeddingModel(environment);
	const embeddingIdentity = embeddingModel
		? environment.ASSISTANT_EMBEDDING_MODEL?.trim() || "text-embedding-3-small"
		: "hybrid";
	const key = `${ASSISTANT_TOOL_CATALOG_VERSION}:${embeddingIdentity}:${signature(definitions)}`;
	const cached = getCachedIndex(key);
	if (cached) return cached;
	const relatedTools = Object.fromEntries(
		definitions.map((definition) => [
			definition.toolId,
			definition.relatedTools.filter((related) =>
				definitions.some((candidate) => candidate.toolId === related),
			),
		]),
	);
	const index = createToolIndex(metadataTools(definitions), {
		strategy: embeddingModel ? "combined" : "hybrid",
		embeddingModel,
		embeddingCache: embeddingModel
			? memoryEmbeddingCache(`${key}:embeddings`)
			: undefined,
		relatedTools,
	});
	setCached(indexCache, key, index);
	return index;
}

function selectionOptions(
	definitions: PublicAssistantTool[],
	maxTools: number,
) {
	return {
		maxTools: Math.max(1, Math.min(maxTools, ASSISTANT_MAX_SELECTED_TOOLS)),
		alwaysActive: definitions
			.filter((definition) => definition.alwaysActive)
			.map((definition) => definition.toolId),
		relatedTools: Object.fromEntries(
			definitions.map((definition) => [
				definition.toolId,
				definition.relatedTools,
			]),
		),
	};
}

export async function selectAssistantTools(
	actor: AssistantToolActor,
	query: string,
	options: {
		maxTools?: number;
		environment?: Readonly<Record<string, string | undefined>>;
	} = {},
) {
	const definitions = discoverAssistantTools(actor);
	if (definitions.length === 0) return [];
	const index = getIndex(definitions, options.environment ?? process.env);
	return index.select(
		query,
		selectionOptions(
			definitions,
			options.maxTools ?? ASSISTANT_MAX_SELECTED_TOOLS,
		),
	);
}

export function createAssistantPrepareStep(
	actor: AssistantToolActor,
	options: {
		maxTools?: number;
		environment?: Readonly<Record<string, string | undefined>>;
	} = {},
) {
	const definitions = discoverAssistantTools(actor);
	if (definitions.length === 0) return undefined;
	return getIndex(definitions, options.environment ?? process.env).prepareStep(
		selectionOptions(
			definitions,
			options.maxTools ?? ASSISTANT_MAX_SELECTED_TOOLS,
		),
	);
}

export async function warmAssistantToolIndex(
	actor: AssistantToolActor,
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	const definitions = discoverAssistantTools(actor);
	if (definitions.length === 0) return;
	await getIndex(definitions, environment).warmUp();
}

export function clearAssistantSelectionCachesForTest() {
	indexCache.clear();
	embeddingCache.clear();
}
