"use client";

import { useProduct } from "@/hooks/use-product";
import { getVariantImage } from "@/lib/images";
import { Button } from "@gnd/ui/button";

interface Variant {
  id: string;
  name: string;
  image: string;
  price?: number;
}

export function ProductVariants() {
  // const ctx = useProduct();
  const { attributes, variant, selectAttribute } = useProduct();
  // ctx.variant;

  return (
    <div className="space-y-3">
      {attributes?.map((attr) => (
        <div key={attr.attributeId} className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">
            {attr.attributeLabel}
          </h3>
          <div className="flex flex-wrap gap-2">
            {attr.options.map((opt) => {
              const isSelected = variant?.attributes.some(
                (a) =>
                  a.attributeId === attr.attributeId &&
                  a.valueId === opt.valueId
              );
              return (
                <Button
                  key={opt.valueId}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectAttribute(attr.attributeId, opt.valueId)}
                >
                  {opt.valueLabel}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
