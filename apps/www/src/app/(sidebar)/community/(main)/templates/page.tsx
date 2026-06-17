import { CommunityTemplateHeader } from "@/components/community-template-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/community-templates/data-table";
import { CommunityTemplatesSkeleton } from "@/components/tables-2/community-templates/skeleton";
import { loadCommunityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
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
		title: "Community Templates | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadCommunityTemplateFilterParams(searchParams);
	const [initialSettings] = await Promise.all([
		getInitialTableSettings("community-templates"),
		queryClient.fetchInfiniteQuery(
			trpc.community.getCommunityTemplates.infiniteQueryOptions({
				...filter,
			}),
		),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<PageTitle>Community Template</PageTitle>
					<CommunityTemplateHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<CommunityTemplatesSkeleton initialSettings={initialSettings} />
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
