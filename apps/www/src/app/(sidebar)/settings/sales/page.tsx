import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { SalesPrintSettingsPage } from "@/components/settings/sales-print-settings-page";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Settings | GND",
	});
}

export default function Page() {
	batchPrefetch([trpc.sales.getPrintSettings.queryOptions()]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="mx-auto flex w-full max-w-[920px] flex-col gap-6 pb-12">
						<div>
							<PageTitle>Sales Settings</PageTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								Configure sales documents and dealer-order operations.
							</p>
						</div>
						<nav className="flex border-b" aria-label="Sales settings sections">
							<span className="border-b-2 border-foreground px-1 pb-3 text-sm font-medium">
								Sales operations
							</span>
						</nav>
						<SalesPrintSettingsPage />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
