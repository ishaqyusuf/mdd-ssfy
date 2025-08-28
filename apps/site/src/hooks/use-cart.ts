import { createContextFactory } from "@/lib/context-factory";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";
import { useGuestId } from "./use-guest-id";
import { useQuery } from "@tanstack/react-query";

export const { Provider: CartProvider, useContext: useCart } =
  createContextFactory(() => {
    const trpc = useTRPC();
    const auth = useAuth();
    const { guestId } = useGuestId();
    const { data, isPending } = useQuery(
      trpc.storefront.getCartList.queryOptions(
        {
          guestId,
        },
        {
          enabled: !!guestId || !!auth?.id,
        }
      )
    );
    return {
      data,
      list: data?.items,
      loadingCart: isPending,
    };
  });
