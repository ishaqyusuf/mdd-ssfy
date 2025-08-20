import { useProductsFilterParams } from "@/hooks/use-products-filter-params";
import { useProductSearch } from "@/hooks/use-product-search";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Label } from "@gnd/ui/label";
import { Slider } from "@gnd/ui/slider";
import { ChevronDown } from "lucide-react";

export function ProductSearchFilters() {
  const { searchFilters } = useProductSearch();
  const { hasFilters, filter, setFilter, clearAllFilters } =
    useProductsFilterParams();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        )}
      </div>
      {/* In Stock Filter */}
      <div className="">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="in-stock"
            checked={filter.inStock}
            onCheckedChange={(checked) =>
              setFilter({
                inStock: checked as boolean,
              })
            }
          />
          <Label htmlFor="in-stock">In Stock Only</Label>
        </div>
      </div>
      {/* Category Filter */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <h4 className="font-medium">Category</h4>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {searchFilters?.categories?.map((category) => (
            <div key={category.slug} className="flex items-center space-x-2">
              <Checkbox
                id={category.slug}
                checked={filter.categorySlug === category.slug}
                onCheckedChange={(checked) => {
                  setFilter({
                    categorySlug: checked ? category.slug : null,
                  });
                }}
              />
              <Label htmlFor={category.slug} className="flex-1">
                {category.name} ({category.count})
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
      {/* Sub Categories */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <h4 className="font-medium">Sub Categories</h4>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {searchFilters?.subCategories?.map((category) => (
            <div key={category.slug} className="flex items-center space-x-2">
              <Checkbox
                id={category.slug}
                checked={filter.subCategorySlug === category.slug}
                onCheckedChange={(checked) => {
                  setFilter({
                    subCategorySlug: checked ? category.slug : null,
                  });
                }}
              />
              <Label htmlFor={category.slug} className="flex-1">
                {category.name} ({category.count})
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
      {/* Price Range Filter */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <h4 className="font-medium">Price Range</h4>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="px-2">
            <Slider
              value={[filter.priceMin, filter.priceMax]}
              onValueChange={(value) => {
                setFilter({
                  priceMin: value[0],
                  priceMax: value[1],
                });
              }}
              max={searchFilters?.priceMax}
              step={50}
              className="mb-4"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>$0</span>
              <span>${searchFilters?.priceMax}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
