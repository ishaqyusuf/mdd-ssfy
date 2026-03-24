import AuthGuard from "@/app-deps/(v2)/(loggedIn)/_components/auth-guard";
import { ErrorFallback } from "@/components/error-fallback";
import { UnitInvoicesHeader } from "@/components/unit-invoices-header";
import { UnitInvoiceModal } from "@/components/modals/unit-invoice-modal";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/unit-invoices/data-table";
import { loadSortParams } from "@/hooks/use-sort-params";
import { loadUnitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { SearchParams } from "nuqs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata() {
  return constructMetadata({
    title: "Unit Invoices | GND",
  });
}

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const filter = loadUnitInvoiceFilterParams(searchParams);
  const { sort } = loadSortParams(searchParams);

  batchPrefetch([
    trpc.community.getUnitInvoices.infiniteQueryOptions({
      ...(filter as any),
      sort,
    }),
  ]);

  return (
    <AuthGuard can={["viewInvoice"]}>
      <div className="flex flex-col gap-6">
        <PageTitle>Unit Invoices</PageTitle>
        <UnitInvoicesHeader />
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <DataTable />
          </Suspense>
        </ErrorBoundary>
        <UnitInvoiceModal />
      </div>
    </AuthGuard>
  );
}
