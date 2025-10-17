"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

import { Input } from "@gnd/ui/input";
import { Button } from "@gnd/ui/button";

export function PriceFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    setMinPrice(searchParams.get("minPrice") || "");
    setMaxPrice(searchParams.get("maxPrice") || "");
  }, [searchParams]);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleApply = () => {
    let newQueryString = searchParams.toString();
    newQueryString = createQueryString("minPrice", minPrice);
    newQueryString = new URLSearchParams(newQueryString).toString(); // Re-parse to apply previous changes
    newQueryString = createQueryString("maxPrice", maxPrice);
    router.push(`?${newQueryString}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Price Range</h3>
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          placeholder="Min"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-24"
        />
        <span>-</span>
        <Input
          type="number"
          placeholder="Max"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-24"
        />
        <Button onClick={handleApply}>Apply</Button>
      </div>
    </div>
  );
}
