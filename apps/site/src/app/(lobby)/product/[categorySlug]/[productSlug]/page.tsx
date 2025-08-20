import { ErrorFallback } from "@/components/error-fallback";
import { ProductClient } from "@/components/product-page/product-client";
import { ProductSkeleton } from "@/components/product-page/skeleton";
import { loadProductFilterParams } from "@/hooks/use-product-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { SearchParams } from "nuqs";
import { Suspense } from "react";

interface Props {
  searchParams: Promise<SearchParams>;
  params: Promise<any>;
}
export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  console.log({ searchParams });
  const params = await props.params;

  const filter = loadProductFilterParams(searchParams);
  batchPrefetch([
    trpc.storefront.productOverview.queryOptions({
      ...filter,
    }),
  ]);

  return (
    <div className="">
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ProductSkeleton />}>
          <ProductClient {...params} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
