"use client";

import type React from "react";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

interface CartItemProps {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
  size?: string;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

export function CartItem({
  id,
  name,
  price,
  quantity,
  image,
  variant,
  size,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const decreaseQuantity = () => {
    if (quantity > 1) {
      onQuantityChange(id, quantity - 1);
    }
  };

  const increaseQuantity = () => {
    onQuantityChange(id, quantity + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value) || 1;
    if (value >= 1) {
      onQuantityChange(id, value);
    }
  };

  return (
    <div className="flex items-center space-x-4 py-4 border-b">
      <img
        src={image || "/placeholder.svg"}
        alt={name}
        className="w-20 h-20 object-cover rounded-md"
      />

      <div className="flex-1">
        <h3 className="font-semibold text-lg">{name}</h3>
        {variant && <p className="text-sm text-gray-600">Finish: {variant}</p>}
        {size && <p className="text-sm text-gray-600">Size: {size}</p>}
        <p className="text-lg font-bold text-amber-700">${price.toFixed(2)}</p>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={decreaseQuantity}
          disabled={quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={quantity}
          onChange={handleInputChange}
          className="w-16 text-center"
          min={1}
        />
        <Button variant="outline" size="icon" onClick={increaseQuantity}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-right">
        <p className="font-bold text-lg">${(price * quantity).toFixed(2)}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(id)}
          className="text-red-600 hover:text-red-800"
        >
          <X className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}
