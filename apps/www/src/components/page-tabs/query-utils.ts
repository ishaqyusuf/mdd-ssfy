export function normalizePagePath(page: string) {
	const [path] = page.split("?");
	if (!path) return "/";
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function normalizeTabQuery(query: string | URLSearchParams) {
	const params =
		typeof query === "string"
			? new URLSearchParams(query.startsWith("?") ? query.slice(1) : query)
			: new URLSearchParams(query.toString());

	params.delete("_page");
	params.delete("cursor");
	params.delete("size");

	return Array.from(params.entries())
		.filter(([, value]) => value !== "")
		.sort(([left], [right]) => left.localeCompare(right))
		.reduce((next, [key, value]) => {
			next.append(key, value);
			return next;
		}, new URLSearchParams())
		.toString();
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
) {
	const next = new URLSearchParams();

	for (const [key, value] of Object.entries(filters || {})) {
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
) {
	const normalizedPage = normalizePagePath(page);
	const normalizedQuery = normalizeTabQuery(query ?? "");

	return normalizedQuery
		? `${normalizedPage}?${normalizedQuery}`
		: normalizedPage;
}

function isActiveFilterValue(value: unknown) {
	if (value === null || value === undefined || value === "") return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}
