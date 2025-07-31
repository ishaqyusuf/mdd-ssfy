"use client";

import { useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { toast } from "@gnd/ui/use-toast";

interface ProductActionsProps {
  product: {
    id: number;
    name: string;
    price: number;
    image: string;
    variant?: string;
    size?: string;
  };
  isFavorite: boolean;
  inStock: boolean;
  price: string;
  onAddToFavorites: () => void;
}

export function ProductActions({
  product,
  onAddToFavorites,
  isFavorite,
  inStock,
  price,
}: ProductActionsProps) {
  const { addItem, isHydrated } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!isHydrated) {
      console.log("Store not hydrated yet, waiting...");
      return;
    }

    setIsAdding(true);
    console.log("Adding product to cart:", product); // Debug log

    try {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        variant: product.variant,
        size: product.size,
      });

      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold text-gray-900">{price}</div>
        <div
          className={`text-sm font-medium ${
            inStock ? "text-green-600" : "text-red-600"
          }`}
        >
          {inStock ? "In Stock" : "Out of Stock"}
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          onClick={handleAddToCart}
          disabled={!inStock || !isHydrated || isAdding}
          className="flex-1 bg-amber-700 hover:bg-amber-800"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isAdding ? "Adding..." : "Add to Cart"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onAddToFavorites}
          className={isFavorite ? "text-red-500 border-red-500" : ""}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
