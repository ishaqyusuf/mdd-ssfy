export const SALES_FORM_MODE_PARAM = "salesFormMode";

export type SalesFormSurface = "legacy" | "new";
export type SalesFormDocumentType = "order" | "quote";
export type SalesFormDocumentMode = "create" | "edit";
export type SalesFormPreferenceMode = SalesFormSurface;
export type SalesFormPreferenceSource =
	| "query"
	| "cookie"
	| "database"
	| "default";

type ResolveSalesFormSurfaceInput = {
	queryMode?: SalesFormPreferenceMode | null;
	cookieMode?: SalesFormPreferenceMode | null;
	databaseMode?: SalesFormPreferenceMode | null;
};

export function normalizeSalesFormPreferenceMode(
	value: unknown,
): SalesFormPreferenceMode | null {
	if (typeof value !== "string") return null;
	const normalized = value.trim().toLowerCase();
	return normalized === "new" || normalized === "legacy" ? normalized : null;
}

export function resolveSalesFormSurface({
	queryMode,
	cookieMode,
	databaseMode,
}: ResolveSalesFormSurfaceInput): {
	surface: SalesFormSurface;
	source: SalesFormPreferenceSource;
} {
	if (queryMode) return { surface: queryMode, source: "query" };
	if (cookieMode) return { surface: cookieMode, source: "cookie" };
	if (databaseMode) return { surface: databaseMode, source: "database" };
	return { surface: "new", source: "default" };
}

type BuildSalesFormHrefInput = {
	surface: SalesFormSurface;
	mode: SalesFormDocumentMode;
	type: SalesFormDocumentType;
	slug?: string | null;
	searchParams?:
		| URLSearchParams
		| Record<string, string | string[] | undefined | null>;
	queryMode?: SalesFormPreferenceMode | null;
};

export function buildSalesFormHref({
	surface,
	mode,
	type,
	slug,
	searchParams,
	queryMode,
}: BuildSalesFormHrefInput) {
	const basePath = surface === "new" ? "/sales-form" : "/sales-book";
	const route = `${mode}-${type}`;
	const path =
		mode === "edit" && slug
			? `${basePath}/${route}/${encodeURIComponent(slug)}`
			: `${basePath}/${route}`;
	const params = toUrlSearchParams(searchParams);

	params.delete(SALES_FORM_MODE_PARAM);
	if (queryMode) params.set(SALES_FORM_MODE_PARAM, queryMode);

	const query = params.toString();
	return query ? `${path}?${query}` : path;
}

function toUrlSearchParams(
	input: BuildSalesFormHrefInput["searchParams"],
): URLSearchParams {
	if (!input) return new URLSearchParams();
	if (input instanceof URLSearchParams) {
		return new URLSearchParams(input);
	}

	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(input)) {
		if (Array.isArray(value)) {
			for (const item of value) params.append(key, item);
		} else if (value != null) {
			params.append(key, value);
		}
	}
	return params;
}
