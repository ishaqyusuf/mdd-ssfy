import PageShell from "@/components/page-shell";
import { SalesRequestMailboxPage } from "@/components/sales-request-mailbox/sales-request-mailbox-page";
import { ScrollableContent } from "@/components/scrollable-content";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({ title: "Sales Requests | GND" });
}

export default function Page() {
	return (
		<PageShell>
			<ScrollableContent>
				<div className="flex flex-col gap-5">
					<PageTitle>Sales Requests</PageTitle>
					<SalesRequestMailboxPage />
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
