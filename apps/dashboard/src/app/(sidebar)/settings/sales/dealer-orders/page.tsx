import { DealerOrderSettingsPage } from "@/components/settings/dealer-order-settings-page";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Dealer Order Settings | GND",
	});
}

export default async function Page() {
	await batchPrefetch([trpc.sales.getPrintSettings.queryOptions()]);

	return (
		<HydrateClient>
			<section
				className="space-y-6"
				aria-labelledby="dealer-orders-settings-title"
			>
				<header>
					<h1
						id="dealer-orders-settings-title"
						className="text-xl font-semibold"
					>
						Dealer orders
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Configure pricing suggestions used while reviewing dealer delivery
						and shipping requests.
					</p>
				</header>
				<DealerOrderSettingsPage />
			</section>
		</HydrateClient>
	);
}
