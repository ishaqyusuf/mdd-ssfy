import { DispatchHeader } from "@/components/dispatch-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/sales-dispatch/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Dispatch Management V2 | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadDispatchFilterParams(searchParams);
	batchPrefetch([
		trpc.dispatch.index.infiniteQueryOptions({
			...(filter as any),
		}),
	]);
	return (
		<PageShell>
			<PageTitle>Dispatch Management V2</PageTitle>
			<div className="flex flex-col gap-6">
				<DispatchHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}
