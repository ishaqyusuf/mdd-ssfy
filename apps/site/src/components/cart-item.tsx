"use client";

import type React from "react";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { QuantityInput } from "@gnd/ui/quantity-input";
import { Input } from "@gnd/ui/input";
import { RouterOutputs } from "@api/trpc/routers/_app";
import Image from "next/image";
import { AspectRatio } from "@gnd/ui/aspect-ratio";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useState } from "react";

interface CartItemProps {
  item: RouterOutputs["storefront"]["getCartList"]["items"][number];
}

export function CartItem({ item }: CartItemProps) {
  const onRemove = () => {};
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [value, setValue] = useState(item.qty);
  const m = useMutation(
    trpc.storefront.updateLineQty.mutationOptions({
      onSuccess(data, variables, context) {
        qc.invalidateQueries({
          queryKey: trpc.storefront.getCartList.queryKey(),
        });
        setValue((variables as any).qty!);
      },
    })
  );

  const valueChange = (v) => {
    if (v > 0)
      m.mutate({
        lineId: item.id,
        qty: v,
      });
  };
  return (
    <div className="flex items-center space-x-4 py-4 border-b">
      <div className="size-20 rounded-md flex border">
        <AspectRatio className="" ratio={2.4}>
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover w-full h-full"
          />
        </AspectRatio>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-lg">{item.title}</h3>
        {item?.attributeDisplay?.map((atr, i) => (
          <p className="text-sm text-gray-600">
            {atr.label}: {atr.value}
          </p>
        ))}
      </div>

      <QuantityInput onChange={valueChange} min={1} value={value} />

      <div className="text-right">
        <p className="font-bold text-lg">${item.total.toFixed(2)}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
        >
          <X className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}
