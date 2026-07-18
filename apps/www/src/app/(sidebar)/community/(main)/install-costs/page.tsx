import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { CommunityInstallCostsSkeleton } from "@/components/tables-2/community-install-costs/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { InstallCostsClient } from "./install-costs-client";
export const dynamic = "force-dynamic";

export function generateMetadata() {
	return constructMetadata({
		title: "Install Costs | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings(
		"community-install-costs",
	);

	batchPrefetch([
		trpc.community.getCommunityInstallCostRates.queryOptions(undefined),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Install Costs</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<CommunityInstallCostsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InstallCostsClient initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
