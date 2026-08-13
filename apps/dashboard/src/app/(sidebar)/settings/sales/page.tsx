import { SalesPrintSettingsPage } from "@/components/settings/sales-print-settings-page";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Document Settings | GND",
	});
}

export default async function Page() {
	await batchPrefetch([trpc.sales.getPrintSettings.queryOptions()]);

	return (
		<HydrateClient>
			<section className="space-y-6" aria-labelledby="documents-settings-title">
				<header>
					<h1 id="documents-settings-title" className="text-xl font-semibold">
						Documents
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Choose how invoices, quotes, packing slips, and production documents
						are rendered.
					</p>
				</header>
				<SalesPrintSettingsPage />
			</section>
		</HydrateClient>
	);
}
