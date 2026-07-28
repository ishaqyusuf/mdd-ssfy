import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { SalesInboundsWorkspace } from "@/components/sales-inbounds-workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { SalesInboundsSkeleton } from "@/components/tables-2/sales-inbounds/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Inbounds | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings("sales-inbounds");

	batchPrefetch([trpc.inventories.inboundShipments.queryOptions({})]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inbounds</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<SalesInboundsSkeleton initialSettings={initialSettings} />
								}
							>
								<SalesInboundsWorkspace initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
