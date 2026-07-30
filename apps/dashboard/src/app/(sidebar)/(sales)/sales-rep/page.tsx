import PageShell from "@/components/page-shell";
import { SalesRepDashboardWorkspace } from "@/components/sales-rep-dashboard/workspace";
import { ScrollableContent } from "@/components/scrollable-content";
import { resolveSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "My Sales | GND",
	});
}

export default async function SalesRepProfilePage(props: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	const params = resolveSalesDashboardParams(searchParams);
	const input = { from: params.from, to: params.to };

	await batchPrefetch([
		trpc.salesRepDashboard.overview.queryOptions(input),
		trpc.salesRepDashboard.trend.queryOptions(input),
		trpc.salesRepDashboard.activity.queryOptions(input),
	]);

	return (
		<PageShell className="p-3 sm:p-4 md:p-6 lg:p-8">
			<HydrateClient>
				<ScrollableContent>
					<PageTitle>Sales</PageTitle>
					<SalesRepDashboardWorkspace />
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
