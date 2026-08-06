export type ShelfProductSearchCategory = {
	id?: number | null;
	name?: string | null;
};

export type ShelfProductSearchIndexItem = {
	id?: number | null;
	title?: string | null;
	unitPrice?: number | null;
	categoryName?: string | null;
	parentCategoryName?: string | null;
	categoryPath?: ShelfProductSearchCategory[] | null;
	[key: string]: unknown;
};

export type ShelfProductSearchOptions = {
	limit?: number;
	selectedIds?: number[];
};

type ParsedSearchText = {
	normalized: string;
	terms: string[];
	measurements: string[];
};

type ExtractedSearchMeasurements = {
	residual: string;
	measurements: string[];
	titleAnchorGroups: string[][];
};

type CompiledShelfProductSearchEntry<
	TProduct extends ShelfProductSearchIndexItem,
> = {
	product: TProduct;
	id: number;
	normalizedTitle: string;
	titleTerms: string[];
	titleTermSet: Set<string>;
	categoryTerms: string[];
	categoryTermSet: Set<string>;
	measurements: string[];
};

export type CompiledShelfProductSearchIndex<
	TProduct extends ShelfProductSearchIndexItem,
> = {
	entries: CompiledShelfProductSearchEntry<TProduct>[];
	byId: Map<number, TProduct>;
};

const nonSearchChars = /[^a-z0-9]+/g;
const diacritics = /\p{Diacritic}/gu;
const complexDimension =
	/\b(\d+)\s*(?:-\s*|['’]\s*|\s+)(\d+)\s*(?:["”″]\s*)?[x×]\s*(\d+)\s*(?:-\s*|['’]\s*|\s+)(\d+)(?:\s*["”″])?\b/gi;
const mixedFraction = /\b(\d+)\s*(?:-\s*|\s+)(\d+)\s*\/\s*(\d+)\b/g;
const simpleDimension =
	/\b(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\b/gi;
const mixedFractionPrefix = /\b(\d+)\s*-\s*(\d+)\b/g;

function normalizeSearchSource(value: unknown) {
	return String(value || "")
		.normalize("NFKD")
		.replace(diacritics, "")
		.toLowerCase();
}

export function normalizeShelfProductSearchQuery(value: unknown) {
	return normalizeSearchSource(value)
		.replace(nonSearchChars, " ")
		.trim()
		.replace(/\s+/g, " ");
}

export function shelfProductSearchCandidateTerms(value: unknown) {
	const normalized = normalizeShelfProductSearchQuery(value);
	if (!normalized) return [];
	return unique(
		normalized
			.split(" ")
			.filter(
				(term) =>
					term !== "x" && (term.length >= 2 || /^\d+$/.test(term)),
			),
	);
}

function unique(values: string[]) {
	return [...new Set(values.filter(Boolean))];
}

function extractSearchMeasurements(
	value: unknown,
	includeTitleAnchors = false,
): ExtractedSearchMeasurements {
	let residual = normalizeSearchSource(value);
	const measurements: string[] = [];
	const titleAnchorGroups: string[][] = [];

	residual = residual.replace(
		complexDimension,
		(_match, widthFeet, widthInches, heightFeet, heightInches) => {
			measurements.push(
				`dimension:${widthFeet}-${widthInches}x${heightFeet}-${heightInches}`,
			);
			if (includeTitleAnchors) {
				titleAnchorGroups.push([
					`${widthFeet} ${widthInches}x${heightFeet} ${heightInches}`,
					`${widthFeet} ${widthInches} x ${heightFeet} ${heightInches}`,
					`${widthFeet}-${widthInches}x${heightFeet}-${heightInches}`,
					`${widthFeet}-${widthInches} x ${heightFeet}-${heightInches}`,
					`${widthFeet}'${widthInches}"x${heightFeet}'${heightInches}"`,
					`${widthFeet}'${widthInches}" x ${heightFeet}'${heightInches}"`,
				]);
			}
			return " ";
		},
	);
	residual = residual.replace(
		mixedFraction,
		(_match, whole, numerator, denominator) => {
			measurements.push(`fraction:${whole}-${numerator}/${denominator}`);
			if (includeTitleAnchors) {
				titleAnchorGroups.push([
					`${whole}-${numerator}/${denominator}`,
					`${whole} ${numerator}/${denominator}`,
				]);
			}
			return " ";
		},
	);
	residual = residual.replace(
		simpleDimension,
		(_match, width, height) => {
			measurements.push(`dimension:${width}x${height}`);
			if (includeTitleAnchors) {
				titleAnchorGroups.push([
					`${width}x${height}`,
					`${width} x ${height}`,
					`${width}×${height}`,
				]);
			}
			return " ";
		},
	);
	residual = residual.replace(
		mixedFractionPrefix,
		(_match, whole, numerator) => {
			measurements.push(`partial-measurement:${whole}-${numerator}`);
			if (includeTitleAnchors) {
				titleAnchorGroups.push([
					`${whole}-${numerator}`,
					`${whole} ${numerator}/`,
					`${whole}-${numerator}x`,
					`${whole}-${numerator} x`,
					`${whole} ${numerator}x`,
					`${whole} ${numerator} x`,
					`x${whole}-${numerator}`,
					`x ${whole}-${numerator}`,
					`x${whole} ${numerator}`,
					`x ${whole} ${numerator}`,
					`${whole}'${numerator}"`,
					`${whole}' ${numerator}"`,
					`${whole}’${numerator}”`,
					`${whole}’ ${numerator}”`,
					`${whole}’${numerator}″`,
				]);
			}
			return " ";
		},
	);

	return {
		residual,
		measurements: unique(measurements),
		titleAnchorGroups: titleAnchorGroups.map(unique),
	};
}

export function shelfProductSearchCandidateTitleAnchorGroups(value: unknown) {
	return extractSearchMeasurements(value, true).titleAnchorGroups;
}

function parseSearchText(value: unknown): ParsedSearchText {
	const extracted = extractSearchMeasurements(value);

	const normalized = normalizeShelfProductSearchQuery(extracted.residual);
	return {
		normalized,
		terms: unique(
			normalized
				? normalized
						.split(" ")
						.filter(
							(term) =>
								term !== "x" &&
								(term.length >= 2 || /^\d+$/.test(term)),
						)
				: [],
		),
		measurements: extracted.measurements,
	};
}

function productId(product: ShelfProductSearchIndexItem) {
	return Number(product?.id || 0);
}

function productCategoryText(product: ShelfProductSearchIndexItem) {
	const categoryPath = Array.isArray(product.categoryPath)
		? product.categoryPath.map((entry) => String(entry?.name || ""))
		: [];
	return [
		String(product.parentCategoryName || ""),
		String(product.categoryName || ""),
		...categoryPath,
	]
		.filter(Boolean)
		.join(" ");
}

export function compileShelfProductSearchIndex<
	TProduct extends ShelfProductSearchIndexItem,
>(products: TProduct[]): CompiledShelfProductSearchIndex<TProduct> {
	const byId = new Map<number, TProduct>();
	for (const product of products) {
		const id = productId(product);
		if (id > 0 && !byId.has(id)) byId.set(id, product);
	}

	const entries = Array.from(byId.values()).map((product) => {
		const title = parseSearchText(product.title);
		const category = parseSearchText(productCategoryText(product));
		return {
			product,
			id: productId(product),
			normalizedTitle: normalizeShelfProductSearchQuery(product.title),
			titleTerms: title.terms,
			titleTermSet: new Set(title.terms),
			categoryTerms: category.terms,
			categoryTermSet: new Set(category.terms),
			measurements: title.measurements,
		};
	});

	return { entries, byId };
}

function dimensionSides(measurement: string) {
	if (!measurement.startsWith("dimension:")) return [];
	const dimension = measurement.slice("dimension:".length);
	const separatorIndex = dimension.indexOf("x");
	if (separatorIndex < 0) return [];
	return [
		dimension.slice(0, separatorIndex),
		dimension.slice(separatorIndex + 1),
	].filter(Boolean);
}

function measurementMatches(productMeasurements: string[], query: string) {
	if (query.startsWith("partial-measurement:")) {
		const prefix = query.slice("partial-measurement:".length);
		return productMeasurements.some(
			(measurement) =>
				measurement === query ||
				measurement === `fraction:${prefix}` ||
				measurement.startsWith(`fraction:${prefix}/`) ||
				dimensionSides(measurement).includes(prefix),
		);
	}
	return productMeasurements.includes(query);
}

function termPenalty(
	terms: string[],
	termSet: Set<string>,
	queryTerm: string,
) {
	if (termSet.has(queryTerm)) return 0;
	if (!/^\d+$/.test(queryTerm)) {
		if (terms.some((term) => term.startsWith(queryTerm))) return 1;
		if (terms.some((term) => term.includes(queryTerm))) return 2;
	}
	return null;
}

function scoreEntry<TProduct extends ShelfProductSearchIndexItem>(
	entry: CompiledShelfProductSearchEntry<TProduct>,
	query: ParsedSearchText,
	rawNormalizedQuery: string,
) {
	if (
		query.measurements.some(
			(measurement) => !measurementMatches(entry.measurements, measurement),
		)
	) {
		return null;
	}

	let penalty = query.measurements.filter((measurement) =>
		measurement.startsWith("partial-measurement:"),
	).length;
	let categoryMatches = 0;
	let containsMatches = 0;

	for (const term of query.terms) {
		const titlePenalty = termPenalty(
			entry.titleTerms,
			entry.titleTermSet,
			term,
		);
		if (titlePenalty != null) {
			penalty += titlePenalty;
			if (titlePenalty === 2) containsMatches += 1;
			continue;
		}
		const categoryPenalty = termPenalty(
			entry.categoryTerms,
			entry.categoryTermSet,
			term,
		);
		if (categoryPenalty == null) return null;
		categoryMatches += 1;
		penalty += categoryPenalty;
	}

	if (rawNormalizedQuery && entry.normalizedTitle === rawNormalizedQuery) {
		return { tier: 0, penalty, categoryMatches };
	}
	if (
		rawNormalizedQuery &&
		entry.normalizedTitle.startsWith(rawNormalizedQuery)
	) {
		return { tier: 1, penalty, categoryMatches };
	}
	if (
		query.terms.length > 1 &&
		query.normalized &&
		entry.normalizedTitle.includes(query.normalized)
	) {
		return { tier: 1, penalty, categoryMatches };
	}
	if (categoryMatches > 0) {
		return { tier: 4, penalty, categoryMatches };
	}
	if (containsMatches > 0) {
		return { tier: 3, penalty, categoryMatches };
	}
	return { tier: 2, penalty, categoryMatches };
}

export function searchCompiledShelfProductIndex<
	TProduct extends ShelfProductSearchIndexItem,
>(
	compiled: CompiledShelfProductSearchIndex<TProduct>,
	query: unknown,
	options: ShelfProductSearchOptions = {},
) {
	const parsedQuery = parseSearchText(query);
	const rawNormalizedQuery = normalizeShelfProductSearchQuery(query);
	const hasRawInput = String(query ?? "").trim().length > 0;
	const limit = Math.max(1, Number(options.limit || 20));
	const hasSearchGroups =
		parsedQuery.terms.length > 0 || parsedQuery.measurements.length > 0;

	const matches = hasRawInput && !hasSearchGroups
		? []
		: compiled.entries
			.flatMap((entry) => {
				const score = scoreEntry(entry, parsedQuery, rawNormalizedQuery);
				return score ? [{ entry, score }] : [];
			})
			.sort((a, b) => {
				if (a.score.tier !== b.score.tier) {
					return a.score.tier - b.score.tier;
				}
				if (a.score.penalty !== b.score.penalty) {
					return a.score.penalty - b.score.penalty;
				}
				const titleCompare = a.entry.normalizedTitle.localeCompare(
					b.entry.normalizedTitle,
				);
				if (titleCompare) return titleCompare;
				return a.entry.id - b.entry.id;
			})
			.slice(0, limit)
			.map((result) => result.entry.product);

	const includedIds = new Set(matches.map(productId));
	const selectedMatches = (options.selectedIds || [])
		.map((id) => compiled.byId.get(Number(id || 0)))
		.filter(
			(product): product is TProduct =>
				product != null && !includedIds.has(productId(product)),
		);

	return [...matches, ...selectedMatches];
}

export function searchShelfProductIndex<
	TProduct extends ShelfProductSearchIndexItem,
>(
	products: TProduct[],
	query: unknown,
	options: ShelfProductSearchOptions = {},
) {
	return searchCompiledShelfProductIndex(
		compileShelfProductSearchIndex(products),
		query,
		options,
	);
}
