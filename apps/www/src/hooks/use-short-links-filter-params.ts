import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";

type FilterKeys = keyof Exclude<RouterInputs["shortLinks"]["list"], void>;

export const shortLinksFilterParams = {
	q: parseAsString,
	includeInactive: parseAsBoolean,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useShortLinksFilterParams() {
	const [filters, setFilters] = useQueryStates(shortLinksFilterParams);

	return {
		filters,
		setFilters,
		hasFilters: Boolean(filters.q) || filters.includeInactive === true,
	};
}

export const loadShortLinksFilterParams = createLoader(shortLinksFilterParams);
