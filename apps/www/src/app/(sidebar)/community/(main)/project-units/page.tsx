import { ErrorFallback } from "@/components/error-fallback";
import { ProjectUnitHeader } from "@/components/project-units-header";
import { DataTable } from "@/components/tables/project-units/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Project Units | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadProjectUnitFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	batchPrefetch([
		trpc.community.getProjectUnits.infiniteQueryOptions({
			...(filter as any),
			sort,
		}),
	]);
	return (
		<PageShell>
			<div className="flex flex-col gap-6">
				<PageTitle>Project Unit</PageTitle>
				<ProjectUnitHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}
