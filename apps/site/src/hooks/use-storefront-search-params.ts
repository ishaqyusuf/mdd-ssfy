import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

const storefrontSearchParams = {
  q: parseAsString.withDefault(""),
  category: parseAsString,
};

export function useStorefrontSearchParams() {
  const [filter, setFilter] = useQueryStates(storefrontSearchParams);
  return {
    filter,
    setFilter,
    hasFilters: Boolean(filter.q || filter.category),
  };
}

export const loadStorefrontSearchParams = createLoader(storefrontSearchParams);
