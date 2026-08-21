import { SalesOverviewViewSettingsPage } from "@/components/settings/sales-overview-view-settings-page";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Overview Settings | GND",
	});
}

export default async function Page() {
	await batchPrefetch([trpc.sales.getSalesOverviewViewSettings.queryOptions()]);

	return (
		<HydrateClient>
			<section
				className="flex flex-col gap-6"
				aria-labelledby="sales-overview-settings-title"
			>
				<header>
					<h1
						id="sales-overview-settings-title"
						className="text-xl font-semibold"
					>
						Sales overview
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Control the General-tab pilot and office rollout.
					</p>
				</header>
				<SalesOverviewViewSettingsPage />
			</section>
		</HydrateClient>
	);
}
