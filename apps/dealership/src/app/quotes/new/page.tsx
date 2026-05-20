import { DealerQuoteComposer } from "@/components/dealer-sales-form/dealer-quote-composer";
import { DealershipShell } from "@/components/dealership-shell";
import PageShell from "@/components/page-shell";
import { requireDealer } from "@/lib/dealer-session";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
	const { dealer } = await requireDealer();

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<PageTitle>Create Quote</PageTitle>
				<DealerQuoteComposer mode="create" />
			</PageShell>
		</DealershipShell>
	);
}
