"use client";

import { getVariantImage } from "@/lib/images";

interface Variant {
  id: string;
  name: string;
  image: string;
  price?: number;
}

export function ProductVariants() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Finish</h3>
      <div className="flex flex-wrap gap-3">
        {/* {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => onVariantChange(variant.id)}
            className={`relative flex flex-col items-center p-3 border-2 rounded-lg transition-colors ${
              selectedVariant === variant.id ? "border-amber-600 bg-amber-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="w-12 h-12 rounded-md overflow-hidden mb-2">
              <img
                src={getVariantImage(variant.id) || "/placeholder.svg"}
                alt={variant.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-medium text-center">{variant.name}</span>
            {variant.price && <span className="text-xs text-gray-500">+${variant.price}</span>}
          </button>
        ))} */}
      </div>
    </div>
  );
}
