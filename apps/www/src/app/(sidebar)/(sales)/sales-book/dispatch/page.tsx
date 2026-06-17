import { DispatchHeader } from "@/components/dispatch-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Dispatch Management | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
type DispatchInput = RouterInputs["dispatch"]["index"];

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadDispatchFilterParams(searchParams);
	const { view: _view, ...dispatchFilter } = filter;
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("sales-dispatch");
	const queryInput = {
		...dispatchFilter,
		sort,
	} as DispatchInput;

	batchPrefetch([
		trpc.dispatch.index.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
		trpc.hrm.getEmployees.queryOptions({
			can: ["viewDelivery"],
			cannot: ["editOrders"],
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Dispatch Managment</PageTitle>
				<div className="flex flex-col gap-6">
					<DispatchHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<SalesDispatchSkeleton initialSettings={initialSettings} />
							}
						>
							<DataTable initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
