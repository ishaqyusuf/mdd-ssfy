"use client";

import { useState, useMemo } from "react";
import { ProductGrid } from "@/components/product-grid";
import { CategoryFilter } from "@/components/category-filter";
import { PriceFilter } from "@/components/price-filter";
import { SortOptions } from "@/components/sort-options";
import { Pagination } from "@/components/pagination";
import { useSearchParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function ShopPageClient() {
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const categories = useMemo(() => {
    // In a real app, categories would likely come from an API as well
    const uniqueCategories = new Set<string>();
    // For now, we'll hardcode some categories or derive from initial data
    ["Interior Doors", "Moldings", "Hardware"].forEach((cat) => uniqueCategories.add(cat));
    return Array.from(uniqueCategories);
  }, []);

  const sortOptions = [
    { label: "Name (A-Z)", value: "name-asc" },
    { label: "Name (Z-A)", value: "name-desc" },
    { label: "Price (Low to High)", value: "price-asc" },
    { label: "Price (High to Low)", value: "price-desc" },
  ];

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (key === "categories") {
        params[key] = value.split(",");
      } else if (key === "minPrice" || key === "maxPrice") {
        params[key] = parseFloat(value);
      } else {
        params[key] = value;
      }
    });
    return params;
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery(
    trpc.shoppingProducts.search.queryOptions(queryParams)
  );

  const products = data?.data || [];
  const totalCount = data?.meta?.count || 0;
  const currentPage = parseInt(searchParams.get("page") || "1");
  const productsPerPage = parseInt(queryParams.size || "20"); // Use size from queryParams
  const totalPages = Math.ceil(totalCount / productsPerPage);

  if (isLoading) return <div className="container py-8">Loading products...</div>;
  if (isError) return <div className="container py-8">Error loading products.</div>;

  return (
    <div className="container mx-auto px-4 py-8 md:flex md:space-x-8 text-foreground">
      <aside className="md:w-1/4 space-y-6">
        <CategoryFilter categories={categories} />
        <PriceFilter />
      </aside>
      <main className="md:w-3/4">
        <div className="flex justify-end mb-4">
          <SortOptions options={sortOptions} />
        </div>
        <ProductGrid products={products} />
        <div className="mt-8">
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      </main>
    </div>
  );
}
