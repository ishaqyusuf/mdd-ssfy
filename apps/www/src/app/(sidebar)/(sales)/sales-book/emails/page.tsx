import PageShell from "@/components/page-shell";
import { SalesEmailLedgerPage } from "@/components/sales-email-ledger-page";
import { ScrollableContent } from "@/components/scrollable-content";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Emails | GND",
	});
}

export default async function Page() {
	const initialSettings = await getInitialTableSettings("sales-email-ledger");

	batchPrefetch([
		trpc.emails.salesEmailAttempts.queryOptions({
			page: 1,
			size: 25,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Emails</PageTitle>
						<SalesEmailLedgerPage initialSettings={initialSettings} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
