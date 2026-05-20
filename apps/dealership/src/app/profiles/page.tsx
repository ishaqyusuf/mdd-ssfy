import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ProfilesHeader } from "@/components/profiles-header";
import { DealershipShell } from "@/components/dealership-shell";
import { DataTable } from "@/components/tables/profiles/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { requireDealer } from "@/lib/dealer-session";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
	const { dealer } = await requireDealer();
	const queryClient = getQueryClient();

	await queryClient.fetchQuery(trpc.dealerPortal.salesProfiles.queryOptions());

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<PageTitle>Sales Profiles</PageTitle>
					<div className="flex flex-col gap-6">
						<ProfilesHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense fallback={<TableSkeleton />}>
								<DataTable />
							</Suspense>
						</ErrorBoundary>
					</div>
				</HydrateClient>
			</PageShell>
		</DealershipShell>
	);
}
