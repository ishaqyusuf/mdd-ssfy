"use client";

import type React from "react";

import { Minus, Plus } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

interface ProductQuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

export function ProductQuantitySelector({
  quantity,
  onQuantityChange,
  min = 1,
  max = 99,
}: ProductQuantitySelectorProps) {
  const decreaseQuantity = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value) || min;
    if (value >= min && value <= max) {
      onQuantityChange(value);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={decreaseQuantity}
          disabled={quantity <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={quantity}
          onChange={handleInputChange}
          className="w-20 text-center"
          min={min}
          max={max}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={increaseQuantity}
          disabled={quantity >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
