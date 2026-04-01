import PageShell from "@/components/page-shell";
import { ErrorFallbackSales } from "@/components/error-fallback-sales";
import { SalesOrdersV2Header } from "@/components/sales-orders-v2-header";
import { SalesOrdersV2SummaryWidgets } from "@/components/sales-orders-v2-summary-widgets";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/sales-orders-v2/data-table";
import { loadSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata() {
  return constructMetadata({
    title: "Sales V2 | GND",
  });
}

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function SalesOrdersV2Page(props: Props) {
  const searchParams = await props.searchParams;
  const filter = loadSalesOrdersV2FilterParams(searchParams);

  batchPrefetch([
    trpc.sales.getOrdersV2.infiniteQueryOptions(filter),
    trpc.sales.getOrdersV2Summary.queryOptions(filter),
  ]);

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <PageTitle>Sales V2</PageTitle>
        <SalesOrdersV2SummaryWidgets />
        <SalesOrdersV2Header />
        <ErrorBoundary errorComponent={ErrorFallbackSales}>
          <Suspense fallback={<TableSkeleton />}>
            <DataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </PageShell>
  );
}
