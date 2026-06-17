import { CustomerHeader } from "@/components/customer-header";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { DataTable } from "@/components/tables-2/customers/data-table";
import { CustomersSkeleton } from "@/components/tables-2/customers/skeleton";
import { loadCustomerFilterParams } from "@/hooks/use-customer-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type CustomersInput = RouterInputs["sales"]["customersIndex"];

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Customers | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadCustomerFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("customers");
	const queryInput = {
		...filter,
		sort,
	} as CustomersInput;

	batchPrefetch([
		trpc.sales.customersIndex.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Sales Customers</PageTitle>
				<div className="flex flex-col gap-6">
					<CustomerHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={<CustomersSkeleton initialSettings={initialSettings} />}
						>
							<DataTable initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
