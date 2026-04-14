import { ErrorFallback } from "@/components/error-fallback";
import { InventoryAllocationReviewPage } from "@/components/inventory/inventory-allocation-review-page";
import PageShell from "@/components/page-shell";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
  await props.searchParams;

  return (
    <PageShell>
      <PageTitle>Inventory Allocations</PageTitle>
      <HydrateClient>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <InventoryAllocationReviewPage />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </PageShell>
  );
}
