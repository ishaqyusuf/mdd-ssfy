import { DealerQuoteComposer } from "@/components/dealer-sales-form/dealer-quote-composer";
import { DealershipShell } from "@/components/dealership-shell";
import { requireDealer } from "@/lib/dealer-session";
import { normalizeSalesFormInitialCustomerId } from "@gnd/sales/sales-form";

export const dynamic = "force-dynamic";

export default async function NewQuotePage(props: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	const { dealer } = await requireDealer();
	const initialCustomerId = normalizeSalesFormInitialCustomerId(
		searchParams.selectedCustomerId,
	);

	return (
		<DealershipShell dealer={dealer} contentMode="fixed">
			<DealerQuoteComposer mode="create" initialCustomerId={initialCustomerId} />
		</DealershipShell>
	);
}
