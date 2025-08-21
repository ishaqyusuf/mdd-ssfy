import { createContextFactory } from "@/lib/context-factory";
import { useTRPC } from "@/trpc/client";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useProductFilterParams } from "./use-product-filter-params";
import { useDebugConsole } from "./use-debug-console";
import { useMemo } from "react";

interface Props {
  categorySlug;
  productSlug;
}
export const { Provider: ProductProvider, useContext: useProduct } =
  createContextFactory((props: Props) => {
    const trpc = useTRPC();
    const { filter, setFilter } = useProductFilterParams();
    const { data, error } = useSuspenseQuery(
      trpc.storefront.productOverview.queryOptions(
        {
          ...props,
        },
        {
          enabled: !!props.productSlug,
        }
      )
    );
    // const {filters,setFilters} = useProductFilterParams();
    // useDebugConsole({ data, error });
    const variant = useMemo(() => {
      const selected = data?.variants?.attributeMaps?.find(
        (a) => a.variantId == filter.variantId
      );
      return selected || data?.variants?.attributeMaps?.[0];
    }, [filter.variantId, data?.variants]);

    return {
      ...(data || {}),
      variant,
    };
  });
