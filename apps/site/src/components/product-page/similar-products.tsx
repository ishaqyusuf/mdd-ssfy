import { ProductCard } from "@/components/product-card";
import { api } from "@/trpc/server";

interface SimilarProductsProps {
  similarProductIds?: string[];
}

export async function SimilarProducts({ similarProductIds }: SimilarProductsProps) {
  const similarProducts = await api.shoppingProducts.getSimilar.query({ ids: similarProductIds });

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-2xl font-bold">Similar Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {similarProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
