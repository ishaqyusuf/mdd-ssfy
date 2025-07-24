import { RouterOutputs } from "@api/trpc/routers/_app";
import { ProductCard } from "@/components/product-card";

interface ProductGridProps {
  products: RouterOutputs["shoppingProducts"]["search"]["data"];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
