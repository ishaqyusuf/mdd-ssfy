import { ProductSearchSection } from "@/components/product-search-section";
import { BodyScrollView } from "@/components/ui/body-scroll-view";
import { useState } from "react";
import { RefreshControl } from "react-native";

import { ProductItem } from "@/components/product-item";
import { generateRandomNumber, selectRandomItem } from "@/lib/utils";
import { ThemedView } from "@/components/ThemedView";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { getBaseUrl } from "@/lib/base-url";
export default function FikriProducts() {
  const [refreshing] = useState(false);
  const trpc = useTRPC();
  const { data, error } = useQuery(
    trpc.podcasts.hello.queryOptions({
      message: "Hello---",
    })
  );

  const products = [...Array(20)].map((_, id) => ({
    id,
    title: `Product - ${id}`,
    status: selectRandomItem("Published", "Draft", "Inactive"),
    type: selectRandomItem(["Item", "Service"]),
    price: generateRandomNumber(3),
  }));
  return (
    <BodyScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl onRefresh={() => {}} refreshing={refreshing} />
      }
    >
      <ThemedView>
        <ProductSearchSection />
        <ThemedText>
          {JSON.stringify({
            data,
            error,
            url: getBaseUrl(),
          })}
        </ThemedText>
        {products?.map((product) => (
          <ProductItem product={product} key={product.id} />
        ))}
      </ThemedView>
    </BodyScrollView>
  );
}
