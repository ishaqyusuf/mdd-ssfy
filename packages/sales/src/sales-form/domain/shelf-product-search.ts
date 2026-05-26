export type ShelfProductSearchIndexItem = {
	id?: number | null;
	title?: string | null;
	unitPrice?: number | null;
	[key: string]: unknown;
};

export type ShelfProductSearchOptions = {
	limit?: number;
	selectedIds?: number[];
};

const nonSearchChars = /[^a-z0-9]+/g;

export function normalizeShelfProductSearchQuery(value: unknown) {
	return String(value || "")
		.toLowerCase()
		.replace(nonSearchChars, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function searchTokens(query: unknown) {
	const normalized = normalizeShelfProductSearchQuery(query);
	return normalized ? normalized.split(" ") : [];
}

function wordStartsWith(title: string, token: string) {
	return title.split(" ").some((part) => part.startsWith(token));
}

function scoreProductTitle(title: string, tokens: string[]) {
	if (!tokens.length) return 0;
	if (tokens.some((token) => !title.includes(token))) return null;
	return tokens.reduce((score, token) => {
		if (title === token) return score;
		if (title.startsWith(token)) return score + 1;
		if (wordStartsWith(title, token)) return score + 2;
		return score + 3;
	}, 0);
}

function productId(product: ShelfProductSearchIndexItem) {
	return Number(product?.id || 0);
}

export function searchShelfProductIndex<TProduct extends ShelfProductSearchIndexItem>(
	products: TProduct[],
	query: unknown,
	options: ShelfProductSearchOptions = {},
) {
	const tokens = searchTokens(query);
	const limit = Math.max(1, Number(options.limit || 20));
	const byId = new Map<number, TProduct>();
	for (const product of products) {
		const id = productId(product);
		if (id > 0 && !byId.has(id)) byId.set(id, product);
	}

	const matches = Array.from(byId.values())
		.map((product) => {
			const title = normalizeShelfProductSearchQuery(product.title);
			return {
				product,
				title,
				score: scoreProductTitle(title, tokens),
			};
		})
		.filter((entry) => entry.score != null)
		.sort((a, b) => {
			if (a.score !== b.score) return Number(a.score) - Number(b.score);
			const titleCompare = a.title.localeCompare(b.title);
			if (titleCompare) return titleCompare;
			return productId(a.product) - productId(b.product);
		})
		.slice(0, limit)
		.map((entry) => entry.product);

	const includedIds = new Set(matches.map(productId));
	const selectedMatches = (options.selectedIds || [])
		.map((id) => byId.get(Number(id || 0)))
		.filter(
			(product): product is TProduct =>
				product != null && !includedIds.has(productId(product)),
		);

	return [...matches, ...selectedMatches];
}
