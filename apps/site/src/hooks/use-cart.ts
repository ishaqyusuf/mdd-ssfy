import createContextFactory from "@/lib/context-factory";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export const { Provider: CartProvider, useContext: useCart } =
  createContextFactory(() => {
    const trpc = useTRPC();
    const { data, isPending } = useQuery(
      trpc.storefrontCommerce.cart.get.queryOptions(),
    );
    return {
      data,
      list: data?.items ?? [],
      loadingCart: isPending,
    };
  });
