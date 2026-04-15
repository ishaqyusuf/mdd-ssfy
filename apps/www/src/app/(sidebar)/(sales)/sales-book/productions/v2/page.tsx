import { ErrorBoundary } from "next/dist/client/components/error-boundary";

import { ErrorFallback } from "@/components/error-fallback";
import { ProductionAdminBoardV2 } from "@/components/production-v2/shared";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Production v2 - gndprodesk.com",
	});
}

export default async function Page() {
	const queryClient = getQueryClient();
	const [_initialDashboard, _initialBoardRows] = await Promise.all([
		queryClient.fetchQuery(
			trpc.sales.productionDashboardV2.queryOptions({
				scope: "admin",
				production: "pending",
				productionDueDate: null,
				q: null,
			}),
		),
		queryClient.fetchInfiniteQuery(
			trpc.sales.productionsV2.infiniteQueryOptions({
				scope: "admin",
				production: "pending",
				show: null,
				productionDueDate: null,
				q: null,
			}) as any,
		),
	]);

	return (
		<PageShell className="">
			<HydrateClient>
				<PageTitle>Sales Production</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<ProductionAdminBoardV2 />
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
