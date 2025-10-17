import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { env } from "@/env.mjs";
import { AspectRatio } from "@gnd/ui/aspect-ratio";

interface ProductCardProps {
  product: RouterOutputs["shoppingProducts"]["search"]["data"][number];
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`} className="group relative block">
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
      <div className="mt-4 flex justify-between">
        <div>
          <h3 className="text-sm text-foreground">
            <span aria-hidden="true" className="absolute inset-0" />
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {/* {product.} */}
          </p>
        </div>
        <p className="text-sm font-medium text-primary">
          {formatPrice(product.price)}
        </p>
      </div>
      <div className="mt-4">
        <Button className="w-full">Add to cart</Button>
      </div>
    </Link>
  );
}
