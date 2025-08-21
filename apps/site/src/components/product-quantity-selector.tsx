"use client";

import type React from "react";

import { Minus, Plus } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { useProductFilterParams } from "@/hooks/use-product-filter-params";
import { useProduct } from "@/hooks/use-product";

interface ProductQuantitySelectorProps {
  // quantity: number;
  // onQuantityChange: (quantity: number) => void;
  // min?: number;
  // max?: number;
}

export function ProductQuantitySelector(
  {
    // quantity,
    // onQuantityChange,
    // min = 1,
    // max = 99,
  }: ProductQuantitySelectorProps
) {
  const { filter, setFilter } = useProductFilterParams();
  const ctx = useProduct();
  const { variant } = ctx;
  // return <></>;
  const decreaseQuantity = () => {
    if (filter.qty > 1) {
      // onQuantityChange(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (filter?.qty < variant?.stockCount) {
      // onQuantityChange(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value) || 1;
    setFilter({
      qty: value,
    });
    // if (value >= min && value <= max) {
    //   onQuantityChange(value);
    // }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={decreaseQuantity}
          disabled={filter?.qty <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={filter?.qty}
          onChange={handleInputChange}
          className="w-20 text-center"
          min={1}
          max={variant?.stockCount}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={increaseQuantity}
          disabled={filter?.qty >= variant?.stockCount}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
