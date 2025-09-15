"use client";

import { useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { useProduct } from "@/hooks/use-product";
import NumberFlow from "@number-flow/react";
import { sum } from "@gnd/utils";
import { useProductFilterParams } from "@/hooks/use-product-filter-params";
import { ProductComponents } from "./product-components";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGuestId } from "@/hooks/use-guest-id";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@gnd/ui/use-toast";

interface ProductActionsProps {}

export function ProductActions() {
  const { addItem, isHydrated } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);
  const ctx = useProduct();
  const { setFilter, filter } = useProductFilterParams();
  const { product, addonComponent, inStock } = ctx;
  const trpc = useTRPC();
  const qc = useQueryClient();
  const addToCart = useMutation(
    trpc.storefront.addToCart.mutationOptions({
      onError(error, variables, context) {
        console.log({ error, variables });
      },

      onSuccess(data, variables, context) {
        qc.invalidateQueries({
          queryKey: trpc.storefront.getCartCount.queryKey(),
        });
        toast({
          title: "Added to cart!",
          variant: "success",
        });
      },
    })
  );
  const { guestId, reset, validGuestId } = useGuestId();
  const { id } = useAuth();
  const handleAddToCart = () => {
    let guestId = !id ? validGuestId() : null;

    if (!id && !guestId) {
      toast({
        title: "Unable to add to cart",
        variant: "destructive",
      });
      return;
    }

    const vf = filter.subComponent;
    const qty = filter.qty;
    addToCart.mutate({
      components:
        addonComponent?.subComponentInventory?.subComponents?.map((c) => {
          const inventoryCategoryId = c?.inventoryCategory?.id;
          const selection = vf?.[inventoryCategoryId];
          const bQty = selection?.qty || 1;
          return {
            inventoryCategoryId,
            inventoryId: selection?.inventoryId,
            inventoryVariantId: selection?.variantId,
            required: !!c?.required,
            subComponentId: c?.id,
            qty: bQty,
            pricing: {
              qty: bQty * qty,
              // TODO: workaround to fetch real price to avoid hacking.
              unitSalesPrice: selection?.price,
              salesPrice: sum([selection?.price * bQty * qty]),
            },
          };
        }) || [],
      guestId,
      inventoryId: product.id,
      inventoryCategoryId: product.category.id,
      variantId: filter.variantId,
      userId: id,
      pricing: {
        qty,
        unitSalesPrice: product.price,
        salesPrice: sum([product.price * qty]),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold text-gray-900">
          <NumberFlow
            prefix="$ "
            value={sum([ctx?.variant?.price * filter?.qty || 1])}
          />
        </div>
        <div
          className={`text-sm font-medium ${
            inStock ? "text-green-600" : "text-red-600"
          }`}
        >
          {inStock ? "In Stock" : "Out of Stock"}
        </div>
      </div>
      <ProductComponents />
      <div className="flex space-x-3">
        <Button
          onClick={handleAddToCart}
          // disabled={!inStock || !isHydrated || isAdding}
          className="flex-1 bg-amber-700 hover:bg-amber-800"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isAdding ? "Adding..." : "Add to Cart"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={addToCart.isPending}
          // onClick={onAddToFavorites}
          // className={isFavorite ? "text-red-500 border-red-500" : ""}
        >
          <Heart
            className={`h-4 w-4 ${ctx.isFavorite ? "fill-current" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
}
