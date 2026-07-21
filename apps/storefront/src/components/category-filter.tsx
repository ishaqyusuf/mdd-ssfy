"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Checkbox } from "@gnd/ui/checkbox";

interface CategoryFilterProps {
  categories: string[];
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategories = searchParams.get("categories")?.split(",") || [];

  const createQueryString = useCallback(
    (name: string, value: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.length === 0) {
        params.delete(name);
      } else {
        params.set(name, value.join(","));
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleCategoryChange = (category: string, checked: boolean) => {
    let newCategories = [...selectedCategories];
    if (checked) {
      newCategories.push(category);
    } else {
      newCategories = newCategories.filter((c) => c !== category);
    }
    router.push(`?${createQueryString("categories", newCategories)}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category} className="flex items-center space-x-2">
            <Checkbox
              id={category}
              checked={selectedCategories.includes(category)}
              onCheckedChange={(checked) =>
                handleCategoryChange(category, checked as boolean)
              }
            />
            <label
              htmlFor={category}
              className="text-sm font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {category}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
