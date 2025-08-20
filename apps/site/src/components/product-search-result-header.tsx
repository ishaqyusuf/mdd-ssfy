"use client";
import { useProductsFilterParams } from "@/hooks/use-products-filter-params";
import { useProductSearch } from "@/hooks/use-product-search";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gnd/ui/select";
import { Grid, List } from "lucide-react";

export function ProductSearchResultHeader() {
  const { count, viewMode, setViewMode } = useProductSearch();
  const { filterCount, filter, setFilter } = useProductsFilterParams();
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <p className="text-gray-600">{count} products found</p>
        {filterCount > 0 && <div className="flex gap-2"></div>}
      </div>
      <div className="flex items-center gap-4">
        <Select
          value={filter.sort}
          onValueChange={(e) => {
            setFilter({
              sort: e,
            });
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
