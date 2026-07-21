"use client";

import {
  ProductSearchProvider,
  useProductSearch,
} from "@/hooks/use-product-search";
import { ProductSearchHeader } from "./product-search-bar";
import { ProductSearchFilters } from "./product-search-filters";
import { Card, CardContent } from "@gnd/ui/card";
import { ProductSearchResultHeader } from "./product-search-result-header";
import { cn } from "@gnd/ui/cn";
import { ProductCard } from "./product-card-1";
import { Button } from "@gnd/ui/button";
import { useProductsFilterParams } from "@/hooks/use-products-filter-params";
import { ProductCardSkeleton } from "./product-card-skeleton";

export default function SearchPageClient() {
  return (
    <ProductSearchProvider>
      <Content />
    </ProductSearchProvider>
  );
}

function Content() {
  const ctx = useProductSearch();
  const { clearAllFilters } = useProductsFilterParams();
  return (
    <div className="container mx-auto px-4 py-8">
      <ProductSearchHeader />
      <div className="flex gap-8">
        <div className="w-80 space-y-6 hidden md:block">
          <Card>
            <CardContent className="p-6">
              <ProductSearchFilters />
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <ProductSearchResultHeader />
          {ctx.count || ctx?.loadingProducts ? (
            <div
              className={cn(
                ctx.viewMode === "grid"
                  ? "grid md:grid-cols-2  lg:grid-cols-3 gap-6"
                  : "space-y-4",
                ""
              )}
            >
              {ctx?.loadingProducts
                ? Array(10)
                    .fill(null)
                    .map((a, i) => <ProductCardSkeleton key={i} />)
                : ctx.searchResult?.map((product) => (
                    <ProductCard key={product.id} data={product} />
                  ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No products found matching your criteria.
              </p>
              <Button
                variant="outline"
                className="mt-4 bg-transparent"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
