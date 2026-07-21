import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
} from "nuqs/server";

const families = ["doors", "mouldings", "shelf-items"] as const;
const statuses = ["online", "offline"] as const;

export const storefrontCatalogFilterParams = {
	q: parseAsString,
	family: parseAsStringEnum([...families]),
	status: parseAsStringEnum([...statuses]),
	featured: parseAsBoolean,
	profileId: parseAsInteger,
	catalogItemId: parseAsString,
};

export const loadStorefrontCatalogFilterParams = createLoader(
	storefrontCatalogFilterParams,
);

export function useStorefrontCatalogFilterParams() {
	const [filters, setFilters] = useQueryStates(storefrontCatalogFilterParams, {
		history: "push",
	});
	return { filters, setFilters };
}
