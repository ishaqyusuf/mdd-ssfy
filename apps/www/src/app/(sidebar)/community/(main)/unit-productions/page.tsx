import { ErrorFallback } from "@/components/error-fallback";
import { UnitProductionsHeader } from "@/components/unit-productions-header";
import { UnitProductionSummaryWidgets } from "@/components/unit-production-summary-widgets";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/unit-productions/data-table";
import { loadSortParams } from "@/hooks/use-sort-params";
import { loadUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { SearchParams } from "nuqs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata() {
  return constructMetadata({
    title: "Unit Productions | GND",
  });
}

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function CommunityProductionsPage(props: Props) {
  const searchParams = await props.searchParams;
  const filter = loadUnitProductionFilterParams(searchParams);
  const { sort } = loadSortParams(searchParams);

  batchPrefetch([
    trpc.community.getUnitProductions.infiniteQueryOptions({
      ...(filter as any),
      sort,
    }),
    trpc.community.getUnitProductionSummary.queryOptions(filter),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Unit Productions</PageTitle>
      <UnitProductionSummaryWidgets />
      <UnitProductionsHeader />
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <DataTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
