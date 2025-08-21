"use client";

import { useProduct } from "@/hooks/use-product";
import { getVariantImage } from "@/lib/images";

interface Variant {
  id: string;
  name: string;
  image: string;
  price?: number;
}

export function ProductVariants() {
  const ctx = useProduct();
  // ctx.variant;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Finish</h3>
      <div className="flex flex-wrap gap-3"></div>
    </div>
  );
}
