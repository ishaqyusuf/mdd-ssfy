import { BuilderHeader } from "@/components/builder-header";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/community-builders/data-table";
import { CommunityBuildersSkeleton } from "@/components/tables-2/community-builders/skeleton";
import { loadBuilderFilterParams } from "@/hooks/use-builder-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

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
	const filter = loadBuilderFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("community-builders");
	const queryInput = {
		...filter,
		sort,
	} as RouterInputs["community"]["getBuilders"];

	batchPrefetch([
		trpc.community.getBuilders.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Builder</PageTitle>
						<BuilderHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<CommunityBuildersSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<DataTable initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
