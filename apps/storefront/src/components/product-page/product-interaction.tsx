"use client";

import { useState } from "react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gnd/ui/select";

interface ProductInteractionProps {
  product: any;
}

export function ProductInteraction({ product }: ProductInteractionProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<{
    [key: string]: string;
  }>({});

  const handleVariantChange = (type: string, option: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [type]: option,
    }));
  };

  const selectedType = selectedVariants["Type"];

  return (
    <>
      {/* Variant Selectors */}
      {product.variants && product.variants.length > 0 && (
        <div className="space-y-4">
          {product.variants.map((variant) => {
            const showVariant =
              variant.type === "Type" ||
              (selectedType === "Slab Only" && variant.type === "Size") ||
              (selectedType === "With Components" &&
                (variant.type === "Bore" ||
                  variant.type === "Bore Type" ||
                  variant.type === "Size" ||
                  variant.type === "Jamb Size" ||
                  variant.type === "Hinge Finish" ||
                  variant.type === "Casing"));

            if (!showVariant) {
              return null;
            }

            return (
              <div key={variant.type}>
                <Select
                  value={selectedVariants[variant.type] || ""}
                  onValueChange={(value) =>
                    handleVariantChange(variant.type, value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`${variant.type}: Select`} />
                  </SelectTrigger>
                  <SelectContent>
                    {variant.options.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}

      {/* Quantity Selector */}
      <div className="flex items-center space-x-4">
        <label htmlFor="quantity" className="text-lg font-medium">
          Quantity:
        </label>
        <Input
          id="quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          className="w-24"
        />
      </div>

      {/* Add to Cart Button */}
      <Button size="lg" className="w-full md:w-auto">
        Add to Cart
      </Button>
    </>
  );
}
