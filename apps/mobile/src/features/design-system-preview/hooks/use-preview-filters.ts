import { useState } from "react";
import type { PreviewFilterState } from "../utils/preview-filtering";

export function usePreviewFilters() {
	const [filters, setFilters] = useState<PreviewFilterState>({
		search: "",
		statuses: new Set(),
		facets: {},
	});

	const setSearch = (search: string) => {
		setFilters((previous) => ({ ...previous, search }));
	};

	const applyFilters = (
		statuses: Set<string>,
		facets: Record<string, Set<string>>,
	) => {
		setFilters((previous) => {
			return {
				...previous,
				statuses: new Set(statuses),
				facets: Object.fromEntries(
					Object.entries(facets).map(([key, values]) => [key, new Set(values)]),
				),
			};
		});
	};

	return {
		filters,
		setSearch,
		applyFilters,
	};
}
