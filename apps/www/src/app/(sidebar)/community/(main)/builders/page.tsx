import { BuilderHeader } from "@/components/builder-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/community-builders/data-table";
import { CommunityBuildersSkeleton } from "@/components/tables-2/community-builders/skeleton";
import { loadBuilderFilterParams } from "@/hooks/use-builder-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Builder | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadBuilderFilterParams(searchParams);
	const initialSettings = await getInitialTableSettings("community-builders");
	const [initialFilterList, _initialBuilders] = await Promise.all([
		queryClient.fetchQuery(trpc.filters.builder.queryOptions()),
		queryClient.fetchInfiniteQuery(
			trpc.community.getBuilders.infiniteQueryOptions({
				...filter,
			}),
		),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Builder</PageTitle>
					<BuilderHeader initialFilterList={initialFilterList} />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<CommunityBuildersSkeleton initialSettings={initialSettings} />
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
