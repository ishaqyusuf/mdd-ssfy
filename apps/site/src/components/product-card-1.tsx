"use client";

import type React from "react";

import { useState } from "react";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@gnd/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import Link from "next/link";
import { toast } from "@gnd/ui/use-toast";
import { RouterOutputs } from "@api/trpc/routers/_app";
import Image from "next/image";
import { AspectRatio } from "@gnd/ui/aspect-ratio";
import { PlaceholderImage } from "./placeholder-image";
import NumberFlow from "@number-flow/react";

interface ProductCardProps {
  data: RouterOutputs["storefront"]["search"]["data"][number];
  onAddToCart?: () => void;
}

export function ProductCard({ data, onAddToCart }: ProductCardProps) {
  const { id, name, price, originalPrice, image, rating, reviews, badge } =
    data;
  const { addItem, isHydrated } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isHydrated) {
      console.log("Store not hydrated yet");
      return;
    }

    setIsAdding(true);

    try {
      // Parse price string to number
      const priceNumber = Number.parseFloat(
        price?.toString().replace("$", "").replace(",", "")
      );

      addItem({
        id,
        name,
        price: priceNumber,
        image,
      });

      toast({
        title: "Added to Cart",
        description: `${name} has been added to your cart.`,
      });

      // Call the optional onAddToCart callback if provided
      onAddToCart?.();
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
    <Link href={data.url}>
      <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader className="p-0">
          <div className="relative overflow-hidden rounded-t-lg">
            <AspectRatio ratio={4 / 3}>
              {!image ? (
                <PlaceholderImage className="rounded-none" asChild />
              ) : (
                <Image
                  src={image}
                  alt={name}
                  className="w-full h-64 object-contain scale-90 group-hover:scale-105 transition-transform  duration-300"
                  // sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, (min-width: 475px) 50vw, 100vw"
                  // fill
                  sizes="(min-width: 1024px) 10vw"
                  fill
                  loading="lazy"
                />
              )}
            </AspectRatio>
            {badge && (
              <Badge className="absolute top-3 left-3 bg-amber-600">
                {badge}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg mb-2 line-clamp-2">{name}</CardTitle>
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            {!reviews || (
              <span className="text-sm text-gray-600 ml-2">({reviews})</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-gray-900">
                <NumberFlow value={price} prefix="USD " />
              </span>
              {originalPrice && originalPrice != price && (
                <span className="text-sm text-gray-500 line-through ml-2">
                  {originalPrice}
                </span>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            className="w-full"
            onClick={handleAddToCart}
            disabled={!isHydrated || isAdding}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isAdding ? "Adding..." : "Add to Cart"}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
