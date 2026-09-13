import {
	SALES_REQUEST_SERVICE_VOCABULARY_ALGORITHM_VERSION,
	SALES_REQUEST_SERVICE_VOCABULARY_DEFAULT_LIMIT,
	SALES_REQUEST_SERVICE_VOCABULARY_MAX_LIMIT,
	SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION,
	type SalesRequestServiceVocabularyCache,
	getSalesRequestServiceVocabularyRevision,
	normalizeSalesRequestServiceVocabularyLimit,
	salesRequestServiceVocabularyCache,
} from "@gnd/cache/sales-request-service-vocabulary-cache";
import { createLoggerWithContext } from "@gnd/logger";

const logger = createLoggerWithContext("sales-request-service-vocabulary");

export const SALES_REQUEST_SERVICE_VOCABULARY_SOURCE_ORDER_LIMIT = 150;
export const SALES_REQUEST_SERVICE_VOCABULARY_DEFAULT_SCOPE = "global";

const MAX_SERVICE_NAME_LENGTH = 80;
const MIN_SERVICE_NAME_LENGTH = 2;

const RESERVED_TRANSPORT_NAMES = new Set([
	"DELIVERY",
	"DELIVERY ONLY",
	"DELIVERY CHARGE",
	"DELIVERY COST",
	"DELIVERY FEE",
	"FREIGHT",
	"FREIGHT ONLY",
	"FREIGHT CHARGE",
	"FREIGHT COST",
	"FREIGHT FEE",
	"PICKUP",
	"PICK UP",
	"PICKUP ONLY",
	"SHIPPING",
	"SHIPPING ONLY",
	"SHIPPING CHARGE",
	"SHIPPING COST",
	"SHIPPING FEE",
	"TRANSPORT",
	"TRANSPORTATION",
	"TRANSPORT ONLY",
	"COURIER",
	"COURIER FEE",
]);

const TRANSPORT_ONLY_PATTERN =
	/^(?:DELIVER(?:Y)?|SHIP(?:PING)?|FREIGHT|TRANSPORT(?:ATION)?|COURIER)(?:\s+(?:ONLY|CHARGE|COST|FEE))?$/;

/** A name with one of these terms is service-like enough to retain as a hint. */
const EXPLICIT_SERVICE_LANGUAGE_PATTERN =
	/\b(?:SERVICE|FEE|LABOU?R|WORK|INSTALL(?:ATION)?|REPAIR|COPY|CUT(?:TING)?|CUT\s*DOWN|CUSTOM(?:IZE|IZATION)?|ASSEMBL(?:E|Y)|MEASURE(?:MENT)?|DISPOSAL|REMOVAL|HAUL(?:ING)?|PAINT(?:ING)?|STAIN(?:ING)?|HANG(?:ING)?|TRIM(?:MING)?|DRILL(?:ING)?|ROUT(?:ING)?|MILL(?:ING)?|MODIF(?:Y|ICATION)|REPLACE(?:MENT)?|SURCHARGE|CHARGE|PICKUP)\b/;

const TRANSPORT_LANGUAGE_PATTERN =
	/\b(?:DELIVER(?:Y)?|SHIP(?:PING)?|FREIGHT|TRANSPORT(?:ATION)?|COURIER)\b/;

const PRODUCT_OR_OPENING_LANGUAGE_PATTERN =
	/\b(?:OPENING|DOOR|WINDOW|SLAB|JAMB|PRE[- ]?HUNG|MASONITE|FIBERGLASS|SOLID\s+CORE|FIRE\s+RATED|INTERIOR|EXTERIOR|LEFT\s+HAND|RIGHT\s+HAND|SINGLE|DOUBLE|\bLH\b|\bRH\b)\b/;

const DIMENSION_PATTERN =
	/\b\d+(?:\.\d+)?\s*(?:["'′″]|MM|CM|M|IN|FT)?\s*(?:X|×)\s*\d/;

const PRODUCT_CODE_PATTERN = /\b[A-Z]{1,5}[-/]?\d{2,}\b/;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const LONG_DIGIT_PATTERN = /(?:\d[\s().+-]?){7,}/;
const ADDRESS_OR_PERSON_PATTERN =
	/\b(?:STREET|ST\.?|AVENUE|AVE\.?|ROAD|RD\.?|BOULEVARD|BLVD\.?|DRIVE|DR\.?|LANE|LN\.?|COURT|CT\.?|HIGHWAY|HWY\.?|SUITE|UNIT|ATTN|CUSTOMER|CLIENT|MR\.?|MRS\.?|MS\.?)\b/;
const FREE_TEXT_RECIPIENT_PATTERN =
	/\b(?:FOR|AT)\s+(?:THE\s+)?[A-Z][A-Z'-]+\s+[A-Z][A-Z'-]+\b/;

export type SalesRequestServiceVocabularyOrder = {
	id?: number | null;
	meta?: unknown;
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
	items?: Array<{ meta?: unknown }>;
};

export type SalesRequestServiceVocabularyFindManyArgs = {
	where: { deletedAt: null };
	select: {
		id: true;
		meta: true;
		createdAt: true;
		updatedAt: true;
		items: {
			where: { deletedAt: null };
			select: { meta: true };
		};
	};
	orderBy: Array<{ updatedAt: "desc" } | { id: "desc" }>;
	take: number;
};

export type SalesRequestServiceVocabularyDatabase = {
	salesOrders: {
		findMany: (
			args: SalesRequestServiceVocabularyFindManyArgs,
		) => Promise<SalesRequestServiceVocabularyOrder[]>;
	};
};

export type ServiceVocabularyDiagnosticReason =
	| "empty"
	| "tooShort"
	| "tooLong"
	| "transportOnly"
	| "privateDataLike"
	| "productOrOpening"
	| "notRepeatedOrServiceLike";

export type SalesRequestServiceVocabularyDiagnostics = {
	scannedOrders: number;
	structuredRows: number;
	acceptedCandidates: number;
	returnedNames: number;
	truncatedCandidates: number;
	excluded: Partial<Record<ServiceVocabularyDiagnosticReason, number>>;
};

export type SalesRequestServiceVocabularyExtraction = {
	names: string[];
	diagnostics: SalesRequestServiceVocabularyDiagnostics;
};

export type GetSalesRequestServiceVocabularyInput = {
	limit?: number;
	scope?: string;
	cache?: SalesRequestServiceVocabularyCache;
	now?: () => Date;
	/** Bypass both cache read and publication for transactional authority checks. */
	fresh?: boolean;
};

export type SalesRequestServiceVocabularyResult = {
	schemaVersion: typeof SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION;
	names: string[];
	revision: string;
};

function readRecord(value: unknown): Record<string, unknown> {
	if (typeof value === "string") {
		try {
			return readRecord(JSON.parse(value));
		} catch {
			return {};
		}
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function readArray(value: unknown): unknown[] {
	if (typeof value === "string") {
		try {
			return readArray(JSON.parse(value));
		} catch {
			return [];
		}
	}
	return Array.isArray(value) ? value : [];
}

function readDate(value: unknown): number {
	if (value instanceof Date) return value.getTime();
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

/**
 * Normalize only the service label. No price, quantity, order identity, or
 * customer metadata is read or carried across this boundary.
 */
export function normalizeSalesRequestServiceName(value: unknown): string {
	if (typeof value !== "string") return "";
	return value
		.normalize("NFKC")
		.replace(/[\u200b\u200c\u200d]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toUpperCase();
}

function incrementReason(
	excluded: Partial<Record<ServiceVocabularyDiagnosticReason, number>>,
	reason: ServiceVocabularyDiagnosticReason,
) {
	excluded[reason] = (excluded[reason] || 0) + 1;
}

function isTransportOnly(name: string) {
	return (
		RESERVED_TRANSPORT_NAMES.has(name) ||
		(TRANSPORT_ONLY_PATTERN.test(name) && !isExplicitServiceName(name)) ||
		(TRANSPORT_LANGUAGE_PATTERN.test(name) && !isExplicitServiceName(name))
	);
}

function isPrivateDataLike(name: string) {
	return (
		EMAIL_PATTERN.test(name) ||
		LONG_DIGIT_PATTERN.test(name) ||
		ADDRESS_OR_PERSON_PATTERN.test(name) ||
		FREE_TEXT_RECIPIENT_PATTERN.test(name)
	);
}

function isExplicitServiceName(name: string) {
	return EXPLICIT_SERVICE_LANGUAGE_PATTERN.test(name);
}

function isNoisyProductOrOpeningDescription(name: string) {
	const explicitServiceLanguage = isExplicitServiceName(name);
	const words = name.split(" ").filter(Boolean);
	if (DIMENSION_PATTERN.test(name) || PRODUCT_CODE_PATTERN.test(name))
		return true;
	if (
		!explicitServiceLanguage &&
		PRODUCT_OR_OPENING_LANGUAGE_PATTERN.test(name)
	)
		return true;
	return !explicitServiceLanguage && words.length > 8;
}

function structuredServiceRows(order: SalesRequestServiceVocabularyOrder) {
	const orderMeta = readRecord(order.meta);
	const persistedForm = readRecord(orderMeta.newSalesForm);
	const lineItems = readArray(persistedForm.lineItems);
	const rows: Record<string, unknown>[] = [];

	for (const lineItem of lineItems) {
		const lineMeta = readRecord(readRecord(lineItem).meta);
		const serviceRows = readArray(lineMeta.serviceRows);
		for (const row of serviceRows) {
			const record = readRecord(row);
			// `service` is intentionally the only accepted label field. In
			// particular, do not fall back to line/item descriptions.
			if (typeof record.service === "string") rows.push(record);
		}
	}
	for (const item of order.items ?? []) {
		const itemMeta = readRecord(item.meta);
		const nestedMeta = readRecord(itemMeta.meta);
		for (const candidate of [itemMeta.serviceRows, nestedMeta.serviceRows]) {
			for (const row of readArray(candidate)) {
				const record = readRecord(row);
				if (typeof record.service === "string") rows.push(record);
			}
		}
	}
	return rows;
}

type Candidate = {
	name: string;
	usageCount: number;
	lastObservedAt: number;
};

/**
 * Build the bounded vocabulary from already-loaded order metadata. This pure
 * seam keeps diagnostics available to local tests/evaluation while the public
 * query only returns names and a revision.
 */
export function extractSalesRequestServiceVocabulary(
	orders: readonly SalesRequestServiceVocabularyOrder[],
	input: { limit?: number } = {},
): SalesRequestServiceVocabularyExtraction {
	const limit = normalizeSalesRequestServiceVocabularyLimit(
		input.limit ?? SALES_REQUEST_SERVICE_VOCABULARY_DEFAULT_LIMIT,
	);
	const excluded: Partial<Record<ServiceVocabularyDiagnosticReason, number>> =
		{};
	const candidates = new Map<string, Candidate>();
	let structuredRowsCount = 0;

	for (const order of orders) {
		const observedAt = Math.max(
			readDate(order.updatedAt),
			readDate(order.createdAt),
		);
		const namesSeenInOrder = new Set<string>();
		for (const row of structuredServiceRows(order)) {
			structuredRowsCount += 1;
			const name = normalizeSalesRequestServiceName(row.service);
			if (namesSeenInOrder.has(name)) continue;
			namesSeenInOrder.add(name);
			if (!name) {
				incrementReason(excluded, "empty");
				continue;
			}
			if (name.length < MIN_SERVICE_NAME_LENGTH) {
				incrementReason(excluded, "tooShort");
				continue;
			}
			if (name.length > MAX_SERVICE_NAME_LENGTH) {
				incrementReason(excluded, "tooLong");
				continue;
			}
			if (isTransportOnly(name)) {
				incrementReason(excluded, "transportOnly");
				continue;
			}
			if (isPrivateDataLike(name)) {
				incrementReason(excluded, "privateDataLike");
				continue;
			}
			if (isNoisyProductOrOpeningDescription(name)) {
				incrementReason(excluded, "productOrOpening");
				continue;
			}

			const existing = candidates.get(name);
			if (existing) {
				existing.usageCount += 1;
				existing.lastObservedAt = Math.max(existing.lastObservedAt, observedAt);
				continue;
			}
			candidates.set(name, {
				name,
				usageCount: 1,
				lastObservedAt: observedAt,
			});
		}
	}

	const eligible = [...candidates.values()].filter((candidate) => {
		if (candidate.usageCount > 1 || isExplicitServiceName(candidate.name)) {
			return true;
		}
		incrementReason(excluded, "notRepeatedOrServiceLike");
		return false;
	});

	eligible.sort(
		(left, right) =>
			right.lastObservedAt - left.lastObservedAt ||
			right.usageCount - left.usageCount ||
			left.name.localeCompare(right.name),
	);

	const names = eligible.slice(0, limit).map((candidate) => candidate.name);
	return {
		names,
		diagnostics: {
			scannedOrders: orders.length,
			structuredRows: structuredRowsCount,
			acceptedCandidates: eligible.length,
			returnedNames: names.length,
			truncatedCandidates: Math.max(0, eligible.length - names.length),
			excluded,
		},
	};
}

function normalizeScope(scope: unknown) {
	if (typeof scope !== "string" || !scope.trim()) {
		return SALES_REQUEST_SERVICE_VOCABULARY_DEFAULT_SCOPE;
	}
	return scope.trim();
}

function createCacheKey(input: GetSalesRequestServiceVocabularyInput) {
	return {
		scope: normalizeScope(input.scope),
		algorithmVersion: SALES_REQUEST_SERVICE_VOCABULARY_ALGORITHM_VERSION,
		limit: normalizeSalesRequestServiceVocabularyLimit(
			input.limit ?? SALES_REQUEST_SERVICE_VOCABULARY_DEFAULT_LIMIT,
		),
	};
}

/**
 * Query the bounded, structured-only vocabulary. Cache failures are treated as
 * misses by the cache adapter, so this always has a bounded fresh DB fallback.
 */
export async function getSalesRequestServiceVocabulary(
	db: SalesRequestServiceVocabularyDatabase,
	input: GetSalesRequestServiceVocabularyInput = {},
): Promise<SalesRequestServiceVocabularyResult> {
	const key = createCacheKey(input);
	const cache = input.cache ?? salesRequestServiceVocabularyCache;
	let cached: Awaited<ReturnType<typeof cache.get>>;
	if (!input.fresh) {
		try {
			cached = await cache.get(key);
		} catch (error) {
			logger.warn("Service vocabulary cache read failed; using database", {
				error,
			});
		}
	}
	if (cached) {
		return {
			schemaVersion: SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION,
			names: [...cached.names],
			revision: cached.revision,
		};
	}

	const orders = await db.salesOrders.findMany({
		where: { deletedAt: null },
		select: {
			id: true,
			meta: true,
			createdAt: true,
			updatedAt: true,
			items: {
				where: { deletedAt: null },
				select: { meta: true },
			},
		},
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		take: SALES_REQUEST_SERVICE_VOCABULARY_SOURCE_ORDER_LIMIT,
	});
	const extracted = extractSalesRequestServiceVocabulary(orders, key);
	const revision = getSalesRequestServiceVocabularyRevision(
		extracted.names,
		key.algorithmVersion,
	);

	logger.debug("Built bounded service vocabulary", {
		scannedOrders: extracted.diagnostics.scannedOrders,
		structuredRows: extracted.diagnostics.structuredRows,
		acceptedCandidates: extracted.diagnostics.acceptedCandidates,
		returnedNames: extracted.diagnostics.returnedNames,
		truncatedCandidates: extracted.diagnostics.truncatedCandidates,
		excluded: extracted.diagnostics.excluded,
	});

	if (!input.fresh) {
		try {
			await cache.set(key, {
				schemaVersion: SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION,
				names: extracted.names,
				generatedAt: (input.now ?? (() => new Date()))().toISOString(),
				revision,
			});
		} catch (error) {
			logger.warn(
				"Service vocabulary cache write failed; returning fresh data",
				{
					error,
				},
			);
		}
	}

	return {
		schemaVersion: SALES_REQUEST_SERVICE_VOCABULARY_SCHEMA_VERSION,
		names: extracted.names,
		revision,
	};
}

export async function getSalesRequestServiceVocabularyNames(
	db: SalesRequestServiceVocabularyDatabase,
	input: GetSalesRequestServiceVocabularyInput = {},
) {
	return (await getSalesRequestServiceVocabulary(db, input)).names;
}

// Keep this alias explicit for callers that describe the seam as a query.
export const querySalesRequestServiceVocabulary =
	getSalesRequestServiceVocabulary;

export { SALES_REQUEST_SERVICE_VOCABULARY_MAX_LIMIT };
