export function normalizePagePath(page: string) {
	const source = page.trim();
	if (!source) return "/";

	let path = source;
	try {
		path = new URL(source, "https://page-tabs.local").pathname;
	} catch {
		const [pathWithHash] = source.split("?");
		path = (pathWithHash ?? "").split("#")[0] ?? "";
	}

	if (!path) return "/";
	const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
	return withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")
		? withLeadingSlash.slice(0, -1)
		: withLeadingSlash;
}

export function normalizeTabQuery(query: string | URLSearchParams) {
	const params =
		typeof query === "string"
			? new URLSearchParams(query.startsWith("?") ? query.slice(1) : query)
			: new URLSearchParams(query.toString());

	params.delete("_page");
	params.delete("cursor");
	params.delete("size");
	params.delete("tabName");

	return Array.from(params.entries())
		.filter(([, value]) => value !== "")
		.sort(
			([leftKey, leftValue], [rightKey, rightValue]) =>
				leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
		)
		.reduce((next, [key, value]) => {
			next.append(key, value);
			return next;
		}, new URLSearchParams())
		.toString();
}

export function pageTabQueriesMatch(
	current: string | URLSearchParams,
	saved: string | URLSearchParams,
) {
	return normalizeTabQuery(current) === normalizeTabQuery(saved);
}

export function queryContainsTabQuery(
	current: string | URLSearchParams,
	tabQuery: string | URLSearchParams,
) {
	const currentParams = new URLSearchParams(
		typeof current === "string" ? current : current.toString(),
	);
	const tabParams = new URLSearchParams(
		typeof tabQuery === "string" ? tabQuery : tabQuery.toString(),
	);

	for (const key of new Set(tabParams.keys())) {
		const currentValues = currentParams.getAll(key).sort();
		const tabValues = tabParams.getAll(key).sort();

		if (currentValues.length !== tabValues.length) return false;
		if (currentValues.some((value, index) => value !== tabValues[index])) {
			return false;
		}
	}

	return normalizeTabQuery(tabParams).length > 0;
}

export function queryFromActiveFilters(
	searchParams: URLSearchParams,
	filters: Record<string, unknown>,
	options?: { searchKey?: string },
) {
	const next = new URLSearchParams();

	for (const [key, value] of Object.entries(filters || {})) {
		if (isSearchQueryKey(key) || key === options?.searchKey) continue;
		if (!isActiveFilterValue(value)) continue;

		const values = searchParams.getAll(key);
		if (values.length) {
			for (const item of values) {
				next.append(key, item);
			}
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				next.append(key, String(item));
			}
			continue;
		}

		next.set(key, String(value));
	}

	for (const key of ["sort"]) {
		for (const value of searchParams.getAll(key)) {
			if (value) next.append(key, value);
		}
	}

	return normalizeTabQuery(next);
}

export function buildPageTabHref(
	page: string,
	query?: string | URLSearchParams | null,
	tabName?: string | null,
) {
	const normalizedPage = normalizePagePath(page);
	const normalizedQuery = normalizeTabQuery(query ?? "");
	const params = new URLSearchParams(normalizedQuery);

	if (tabName?.trim()) {
		params.set("tabName", tabName.trim());
	}

	const hrefQuery = params.toString();

	return hrefQuery ? `${normalizedPage}?${hrefQuery}` : normalizedPage;
}

export function isSearchQueryKey(key: string) {
	return key === "q" || key === "search" || key.startsWith("_q");
}

function isActiveFilterValue(value: unknown) {
	if (value === null || value === undefined || value === "") return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}
