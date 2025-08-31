import createContextFactory from "@/lib/context-factory";
import { useProductsFilterParams } from "./use-products-filter-params";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useEffect, useState } from "react";
import { RouterOutputs } from "@api/trpc/routers/_app";

export const { Provider: ProductSearchProvider, useContext: useProductSearch } =
  createContextFactory(() => {
    const { setFilter, filter } = useProductsFilterParams();
    const trpc = useTRPC();
    const { data: productData, isPending } = useQuery(
      trpc.storefront.search.queryOptions({
        ...filter,
      })
    );
    const [viewMode, setViewMode] = useState("grid");
    const [searchFilters, setSearchFilters] =
      useState<RouterOutputs["storefront"]["searchFilters"]>(undefined);

    const { data: __searchFilters, error: searchFilterError } = useQuery(
      trpc.storefront.searchFilters.queryOptions({
        ...filter,
      })
    );
    useEffect(() => {
      if (!searchFilters) setSearchFilters(__searchFilters);
      else {
        // compare and compose new search filters.
        // remove previously selected filter that is not in new filter!
      }
    }, [__searchFilters]);
    return {
      searchResult: productData?.data || [],
      count: productData?.meta?.count,
      loadingProducts: isPending,
      searchFilters,
      viewMode,
      setViewMode,
    };
  });
