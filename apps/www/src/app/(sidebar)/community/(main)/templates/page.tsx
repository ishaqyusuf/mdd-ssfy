import { CommunityTemplateHeader } from "@/components/community-template-header";
import { ErrorFallback } from "@/components/error-fallback";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/community-templates/data-table";
import { CommunityTemplatesSkeleton } from "@/components/tables-2/community-templates/skeleton";
import { loadCommunityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Community Templates | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadCommunityTemplateFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("community-templates");
	const queryInput = {
		...filter,
		sort,
	} as RouterInputs["community"]["getCommunityTemplates"];

	batchPrefetch([
		trpc.community.getCommunityTemplates.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Community Template</PageTitle>
						<CommunityTemplateHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<CommunityTemplatesSkeleton
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
