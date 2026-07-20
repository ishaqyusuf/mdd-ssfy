"use client";

import { useTRPC } from "@/trpc/client";
import type { StorefrontRouterOutputs } from "@gnd/api/trpc/routers/storefront-app";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { QuantityInput } from "@gnd/ui/quantity-input";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type CartLine =
  StorefrontRouterOutputs["storefrontCommerce"]["cart"]["get"]["items"][number];

function configurationSelections(configuration: unknown) {
  if (!configuration || typeof configuration !== "object") return [];
  const formSteps = (configuration as { formSteps?: unknown }).formSteps;
  if (!Array.isArray(formSteps)) return [];
  return formSteps.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const step = entry as {
      value?: unknown;
      step?: { title?: unknown } | null;
    };
    const label = String(step.step?.title ?? "").trim();
    const value = String(step.value ?? "").trim();
    return label && value ? [{ label, value }] : [];
  });
}

export function CartItem({ item }: { item: CartLine }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(item.quantity);
  const invalidateCollections = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.storefrontCommerce.cart.get.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.storefrontCommerce.wishlist.get.queryKey(),
      }),
    ]);
  const updateQuantity = useMutation(
    trpc.storefrontCommerce.cart.updateQuantity.mutationOptions({
      onSuccess: (_, variables) => {
        if (variables && "quantity" in variables) {
          setQuantity(variables.quantity);
        }
        void invalidateCollections();
      },
      onError: (error) =>
        toast({ title: error.message, variant: "destructive" }),
    }),
  );
  const remove = useMutation(
    trpc.storefrontCommerce.cart.remove.mutationOptions({
      onSuccess: () => void invalidateCollections(),
      onError: (error) =>
        toast({ title: error.message, variant: "destructive" }),
    }),
  );
  const moveToWishlist = useMutation(
    trpc.storefrontCommerce.cart.moveToWishlist.mutationOptions({
      onSuccess: () => {
        void invalidateCollections();
        toast({ title: "Saved to your wishlist", variant: "success" });
      },
      onError: (error) =>
        toast({ title: error.message, variant: "destructive" }),
    }),
  );
  const selections = configurationSelections(item.configuration);
  const configured = item.configuration as {
    housePackageTool?: { doors?: unknown[] } | null;
  };
  const hasDoorSchedule = Boolean(
    configured?.housePackageTool?.doors?.length,
  );

  return (
    <article className="flex flex-col gap-4 border-b py-5 sm:flex-row sm:items-start">
      <div className="size-24 shrink-0 overflow-hidden rounded-md border bg-muted">
        {item.offer?.imageUrl ? (
          // Storefront images are admin-configured URLs and may use multiple CDNs.
          <img
            src={item.offer.imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Icons.ShoppingBag className="size-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {item.offer ? (
          <Link
            href={`/products/${item.offer.slug}`}
            className="font-semibold hover:text-amber-800"
          >
            {item.offer.title}
          </Link>
        ) : (
          <h3 className="font-semibold">Unavailable product</h3>
        )}
        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
          {selections.map((selection) => (
            <p key={`${selection.label}:${selection.value}`}>
              {selection.label}: {selection.value}
            </p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => moveToWishlist.mutate({ lineId: item.id })}
            disabled={moveToWishlist.isPending}
          >
            <Icons.Heart className="mr-1 size-4" />
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => remove.mutate({ lineId: item.id })}
            disabled={remove.isPending}
          >
            <Icons.X className="mr-1 size-4" />
            Remove
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end">
        {hasDoorSchedule ? (
          <Button asChild variant="outline" size="sm">
            <Link href={item.offer ? `/products/${item.offer.slug}` : "/search"}>
              Edit configuration
            </Link>
          </Button>
        ) : (
          <QuantityInput
            min={1}
            value={quantity}
            onChange={(value) => {
              if (value > 0 && value !== quantity) {
                updateQuantity.mutate({ lineId: item.id, quantity: value });
              }
            }}
          />
        )}
        <p className="text-lg font-bold">${item.lineTotal.toFixed(2)}</p>
      </div>
    </article>
  );
}
