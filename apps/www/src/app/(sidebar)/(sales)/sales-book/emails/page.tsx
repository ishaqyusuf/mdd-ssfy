import PageShell from "@/components/page-shell";
import { SalesEmailLedgerPage } from "@/components/sales-email-ledger-page";
import { ScrollableContent } from "@/components/scrollable-content";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Emails | GND",
	});
}

export default function Page() {
	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Emails</PageTitle>
						<SalesEmailLedgerPage />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
