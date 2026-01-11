import { useMemo, useState } from "react";
import { useDebounce } from "./use-debounce";
import { listFilter } from "@gnd/utils";

interface Props<T> {
  items: T[];
}
export function useSearch<T>(props: Props<T>) {
  const [query, setQuery] = useState(null);
  const debouncedSearchInput = useDebounce(query, 500);

  const results = useMemo(() => {
    if (!props.items?.length) return [];
    const titledItems = props?.items?.map((item) => {
      return item;
    });
    return listFilter(titledItems, debouncedSearchInput, true);
  }, [props.items, debouncedSearchInput]);
  // if fl is function, use to get search string;
  return {
    query,
    results,
    clear() {
      setQuery(null);
    },
  };
}
