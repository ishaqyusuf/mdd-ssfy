import { createContextFactory } from "@/lib/context-factory";
import { useTRPC } from "@/trpc/client";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useProductFilterParams } from "./use-product-filter-params";
import { useDebugConsole } from "./use-debug-console";

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
    useDebugConsole({ data, error });
    return {
      ...(data || {}),
    };
  });
