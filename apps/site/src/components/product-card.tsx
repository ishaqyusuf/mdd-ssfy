import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@gnd/ui/card";
import { Button } from "@gnd/ui/button";
import { StarIcon } from "lucide-react";
import type { Product } from "@/lib/types"; // Assuming a types file for Product

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-transform duration-300 ease-in-out hover:-translate-y-2">
      <Link
        href={`/product/${product.slug}`}
        className="absolute inset-0 z-10"
        prefetch={false}
      >
        <span className="sr-only">View {product.name}</span>
      </Link>
      <Image
        src={product.imageUrl || "/placeholder.svg"}
        alt={product.name}
        width={400}
        height={300}
        className="w-full h-48 object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
      />
      <CardContent className="p-4 bg-white dark:bg-gray-950">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-50">
            ${product.price.toFixed(2)}
          </span>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <StarIcon className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>
              {product.rating.toFixed(1)} ({product.reviews})
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full bg-transparent">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
