"use client";
import { useProductsFilterParams } from "@/hooks/use-products-filter-params";
import { useProductSearch } from "@/hooks/use-product-search";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@gnd/ui/sheet";
import { Filter, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { ProductSearchFilters } from "./product-search-filters";

export function ProductSearchHeader() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const ctx = useProductSearch();
  const { hasFilters, filterCount } = useProductsFilterParams();
  const [openFilter, setOpenFilter] = useState(false);
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Products</h1>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search doors, hardware, and millwork..."
            className="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="md:hidden">
          <Sheet open={openFilter} onOpenChange={setOpenFilter}>
            <SheetTrigger asChild>
              <Button
                onClick={(e) => {
                  setOpenFilter(true);
                }}
                variant="outline"
                className="md:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {filterCount > 0 && `(${filterCount})`}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle></SheetTitle>
              </SheetHeader>
              <ProductSearchFilters />
            </SheetContent>
          </Sheet>
        </div>
        {/* <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button> */}
      </div>
    </div>
  );
}
