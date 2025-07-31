"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, Grid, List, ChevronDown } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card-1";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Card, CardContent } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import { Slider } from "@gnd/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gnd/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Badge } from "@gnd/ui/badge";
import { images } from "@/lib/images";

// Mock product data with real images
const allProducts = [
  {
    id: 1,
    name: "Craftsman Style Interior Door",
    price: 299.99,
    originalPrice: 349.99,
    image: images.products.craftsmanDoor,
    rating: 4.8,
    reviews: 24,
    badge: "Best Seller",
    category: "interior-doors",
    material: "Wood",
    style: "Craftsman",
    inStock: true,
  },
  {
    id: 2,
    name: "Solid Oak Exterior Door",
    price: 899.99,
    image: images.products.oakExteriorDoor,
    rating: 4.9,
    reviews: 18,
    badge: "Premium",
    category: "exterior-doors",
    material: "Oak",
    style: "Traditional",
    inStock: true,
  },
  {
    id: 3,
    name: "Modern Barn Door Kit",
    price: 449.99,
    image: images.products.barnDoorKit,
    rating: 4.7,
    reviews: 31,
    badge: "Trending",
    category: "interior-doors",
    material: "Wood",
    style: "Modern",
    inStock: true,
  },
  {
    id: 4,
    name: "French Door Set",
    price: 1299.99,
    image: images.products.frenchDoors,
    rating: 4.9,
    reviews: 12,
    badge: "New",
    category: "interior-doors",
    material: "Wood",
    style: "Traditional",
    inStock: false,
  },
  {
    id: 5,
    name: "Steel Security Door",
    price: 599.99,
    image: images.products.securityDoor,
    rating: 4.6,
    reviews: 28,
    category: "exterior-doors",
    material: "Steel",
    style: "Modern",
    inStock: true,
  },
  {
    id: 6,
    name: "Glass Panel Interior Door",
    price: 399.99,
    image: images.products.glassPanelDoor,
    rating: 4.5,
    reviews: 15,
    category: "interior-doors",
    material: "Wood",
    style: "Modern",
    inStock: true,
  },
  {
    id: 7,
    name: "Brass Door Handle Set",
    price: 89.99,
    image: images.products.brassHandle,
    rating: 4.7,
    reviews: 42,
    category: "hardware",
    material: "Brass",
    style: "Traditional",
    inStock: true,
  },
  {
    id: 8,
    name: "Smart Lock System",
    price: 249.99,
    image: images.products.smartLock,
    rating: 4.4,
    reviews: 33,
    badge: "New",
    category: "hardware",
    material: "Steel",
    style: "Modern",
    inStock: true,
  },
  {
    id: 9,
    name: "Mahogany Entry Door",
    price: 1199.99,
    image: images.products.mahoganyDoor,
    rating: 4.9,
    reviews: 8,
    badge: "Premium",
    category: "exterior-doors",
    material: "Mahogany",
    style: "Traditional",
    inStock: true,
  },
  {
    id: 10,
    name: "Sliding Door Hardware Kit",
    price: 159.99,
    image: images.products.slidingHardware,
    rating: 4.6,
    reviews: 25,
    category: "hardware",
    material: "Steel",
    style: "Modern",
    inStock: true,
  },
];

const categories = [
  { id: "interior-doors", name: "Interior Doors", count: 4 },
  { id: "exterior-doors", name: "Exterior Doors", count: 3 },
  { id: "hardware", name: "Hardware", count: 3 },
];

const materials = [
  { id: "wood", name: "Wood", count: 5 },
  { id: "oak", name: "Oak", count: 1 },
  { id: "mahogany", name: "Mahogany", count: 1 },
  { id: "steel", name: "Steel", count: 2 },
  { id: "brass", name: "Brass", count: 1 },
];

const styles = [
  { id: "traditional", name: "Traditional", count: 4 },
  { id: "modern", name: "Modern", count: 4 },
  { id: "craftsman", name: "Craftsman", count: 1 },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 1500]);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Initialize filters from URL params
  useEffect(() => {
    const category = searchParams.get("category");
    if (category && selectedCategories.length === 0) {
      setSelectedCategories([category]);
    }
  }, []);

  // Separate effect to handle URL changes after initial mount
  useEffect(() => {
    const category = searchParams.get("category");
    if (category && !selectedCategories.includes(category)) {
      setSelectedCategories((prev) => (prev.length === 0 ? [category] : prev));
    }
  }, [searchParams.get("category")]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const filtered = allProducts.filter((product) => {
      // Search query filter
      if (
        searchQuery &&
        !product.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Category filter
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(product.category)
      ) {
        return false;
      }

      // Material filter
      if (
        selectedMaterials.length > 0 &&
        !selectedMaterials.includes(product.material.toLowerCase())
      ) {
        return false;
      }

      // Style filter
      if (
        selectedStyles.length > 0 &&
        !selectedStyles.includes(product.style.toLowerCase())
      ) {
        return false;
      }

      // Price range filter
      if (product.price < priceRange[0] || product.price > priceRange[1]) {
        return false;
      }

      // In stock filter
      if (inStockOnly && !product.inStock) {
        return false;
      }

      return true;
    });

    // Sort products
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Keep original order for relevance
        break;
    }

    return filtered;
  }, [
    searchQuery,
    selectedCategories,
    selectedMaterials,
    selectedStyles,
    priceRange,
    sortBy,
    inStockOnly,
  ]);

  const handleCategoryChange = useCallback(
    (categoryId: string, checked: boolean) => {
      setSelectedCategories((prev) => {
        if (checked) {
          return prev.includes(categoryId) ? prev : [...prev, categoryId];
        } else {
          return prev.filter((id) => id !== categoryId);
        }
      });
    },
    []
  );

  const handleMaterialChange = useCallback(
    (materialId: string, checked: boolean) => {
      setSelectedMaterials((prev) => {
        if (checked) {
          return prev.includes(materialId) ? prev : [...prev, materialId];
        } else {
          return prev.filter((id) => id !== materialId);
        }
      });
    },
    []
  );

  const handleStyleChange = useCallback((styleId: string, checked: boolean) => {
    setSelectedStyles((prev) => {
      if (checked) {
        return prev.includes(styleId) ? prev : [...prev, styleId];
      } else {
        return prev.filter((id) => id !== styleId);
      }
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedMaterials([]);
    setSelectedStyles([]);
    setPriceRange([0, 1500]);
    setInStockOnly(false);
    setSearchQuery("");
  }, []);

  const activeFiltersCount =
    selectedCategories.length +
    selectedMaterials.length +
    selectedStyles.length +
    (inStockOnly ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Search Products
          </h1>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search doors, hardware, and millwork..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div
            className={`w-80 space-y-6 ${
              showFilters ? "block" : "hidden"
            } md:block`}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear All
                    </Button>
                  )}
                </div>

                {/* In Stock Filter */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="in-stock"
                      checked={inStockOnly}
                      onCheckedChange={(checked) =>
                        setInStockOnly(checked as boolean)
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
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={category.id}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) =>
                            handleCategoryChange(
                              category.id,
                              checked as boolean
                            )
                          }
                        />
                        <Label htmlFor={category.id} className="flex-1">
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
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={1500}
                        step={50}
                        className="mb-4"
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>${priceRange[0]}</span>
                        <span>${priceRange[1]}</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Material Filter */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                    <h4 className="font-medium">Material</h4>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={material.id}
                          checked={selectedMaterials.includes(material.id)}
                          onCheckedChange={(checked) =>
                            handleMaterialChange(
                              material.id,
                              checked as boolean
                            )
                          }
                        />
                        <Label htmlFor={material.id} className="flex-1">
                          {material.name} ({material.count})
                        </Label>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Style Filter */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                    <h4 className="font-medium">Style</h4>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {styles.map((style) => (
                      <div
                        key={style.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={style.id}
                          checked={selectedStyles.includes(style.id)}
                          onCheckedChange={(checked) =>
                            handleStyleChange(style.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={style.id} className="flex-1">
                          {style.name} ({style.count})
                        </Label>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* Products Section */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <p className="text-gray-600">
                  {filteredProducts.length} products found
                </p>
                {activeFiltersCount > 0 && (
                  <div className="flex gap-2">
                    {selectedCategories.map((categoryId) => {
                      const category = categories.find(
                        (c) => c.id === categoryId
                      );
                      return (
                        <Badge
                          key={categoryId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            handleCategoryChange(categoryId, false)
                          }
                        >
                          {category?.name} ×
                        </Badge>
                      );
                    })}
                    {selectedMaterials.map((materialId) => {
                      const material = materials.find(
                        (m) => m.id === materialId
                      );
                      return (
                        <Badge
                          key={materialId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            handleMaterialChange(materialId, false)
                          }
                        >
                          {material?.name} ×
                        </Badge>
                      );
                    })}
                    {selectedStyles.map((styleId) => {
                      const style = styles.find((s) => s.id === styleId);
                      return (
                        <Badge
                          key={styleId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleStyleChange(styleId, false)}
                        >
                          {style?.name} ×
                        </Badge>
                      );
                    })}
                    {inStockOnly && (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setInStockOnly(false)}
                      >
                        In Stock ×
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="price-low">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-high">
                      Price: High to Low
                    </SelectItem>
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

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }
              >
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={`$${product.price.toFixed(2)}`}
                    originalPrice={
                      product.originalPrice
                        ? `$${product.originalPrice.toFixed(2)}`
                        : undefined
                    }
                    image={product.image}
                    rating={product.rating}
                    reviews={product.reviews}
                    badge={product.badge}
                  />
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

      <Footer />
    </div>
  );
}
