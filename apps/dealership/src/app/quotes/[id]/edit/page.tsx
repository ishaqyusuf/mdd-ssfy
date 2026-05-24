import { DealerQuoteComposer } from "@/components/dealer-sales-form/dealer-quote-composer";
import { DealershipShell } from "@/components/dealership-shell";
import { requireDealer } from "@/lib/dealer-session";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const quoteId = Number(id);
	if (!Number.isFinite(quoteId)) notFound();
	const { dealer } = await requireDealer();

	return (
		<DealershipShell dealer={dealer} contentMode="fixed">
			<DealerQuoteComposer mode="edit" quoteId={quoteId} />
		</DealershipShell>
	);
}
