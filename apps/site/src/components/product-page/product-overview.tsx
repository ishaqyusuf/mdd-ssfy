"use client";
import Image from "next/image";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { env } from "@/env.mjs";
import { AspectRatio } from "@gnd/ui/aspect-ratio";
import { ProductInteraction } from "./product-interaction";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

interface ProductOverviewProps {
  productId;
}

export function ProductOverview({ productId }: ProductOverviewProps) {
  const trpc = useTRPC();
  const { data: product } = useQuery(
    trpc.shoppingProducts.getById.queryOptions({
      id: productId,
    })
  );
  if (!product) return;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="overflow-hidden rounded-md">
          <AspectRatio ratio={4 / 3}>
            <Image
              src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${product.img}`}
              alt={product.name}
              className="object-cover"
              sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, (min-width: 475px) 50vw, 100vw"
              fill
              loading="lazy"
            />
          </AspectRatio>
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-lg text-muted-foreground mt-2">
          {/* {product.description} */}
        </p>
        <p className="text-2xl font-bold mt-4">{product.price}</p>
        <div className="mt-4">
          <ProductInteraction product={product} />
        </div>
      </div>
    </div>
  );
}
