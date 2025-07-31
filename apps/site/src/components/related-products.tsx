import { ProductCard } from "@/components/product-card-1";

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  rating: number;
  reviews: number;
  badge?: string;
}

interface RelatedProductsProps {
  products: Product[];
  onAddToCart: () => void;
}

export function RelatedProducts({
  products,
  onAddToCart,
}: RelatedProductsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Related Products</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
