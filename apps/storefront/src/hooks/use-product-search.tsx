"use client";

import createContextFactory from "@/lib/context-factory";
import { useProductsFilterParams } from "./use-products-filter-params";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useState } from "react";

export const { Provider: ProductSearchProvider, useContext: useProductSearch } =
  createContextFactory(() => {
    const { setFilter, filter } = useProductsFilterParams();
    const trpc = useTRPC();
    const searchInput = {
      query: filter.q,
      inStock: filter.inStock,
      categorySlug: filter.categorySlug,
      subCategorySlug: filter.subCategorySlug,
      priceMin: filter.priceMin,
      priceMax: filter.priceMax,
      sort: filter.sort ? [filter.sort] : null,
    };
    const { data: productData, isPending } = useQuery(
      trpc.storefront.search.queryOptions(searchInput)
    );
    const [viewMode, setViewMode] = useState("grid");

    const { data: searchFilters } = useQuery(
      trpc.storefront.searchFilters.queryOptions(searchInput)
    );
    return {
      searchResult: productData?.data || [],
      count: productData?.meta?.count,
      loadingProducts: isPending,
      searchFilters,
      viewMode,
      setViewMode,
    };
  });
