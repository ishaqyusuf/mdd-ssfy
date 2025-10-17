import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/backlogs/data-table";
import { BacklogsHeader } from "@/components/backlog-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadBacklogFilterParams } from "@/hooks/use-backlog-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
  return constructMetadata({
    title: "Backlogs | GND",
  });
}
type Props = {
  searchParams: Promise<SearchParams>;
};
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const filter = loadBacklogFilterParams(searchParams);
  batchPrefetch([
    trpc.backlogs.getBacklogs.infiniteQueryOptions({
      ...filter,
    }),
  ]);
  return (
    <div>
      <PageTitle>Backlogs</PageTitle>
      <BacklogsHeader />
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <DataTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
