type CatalogComponent = {
	id: number;
	title?: string | null;
	uid?: string | null;
};

export function isInitialCatalogRankingPending({
	enabled,
	catalogPending,
	catalogError,
	usagePending,
}: {
	enabled: boolean;
	catalogPending: boolean;
	catalogError: boolean;
	usagePending: boolean;
}) {
	return enabled && !catalogError && (catalogPending || usagePending);
}

export function mergeComponentsWithUsage<T extends CatalogComponent>(
	components: T[],
	usage: Array<{ id: number; statistics: number }>,
) {
	const usageById = new Map(usage.map((row) => [row.id, row.statistics]));
	return components
		.map((component) => ({
			...component,
			statistics: usageById.get(component.id) ?? 0,
		}))
		.sort(
			(a, b) =>
				b.statistics - a.statistics ||
				String(a.title || "").localeCompare(String(b.title || "")) ||
				String(a.uid || "").localeCompare(String(b.uid || "")),
		);
}
