import { DealerQuoteComposer } from "@/components/dealer-sales-form/dealer-quote-composer";
import { DealershipShell } from "@/components/dealership-shell";
import { requireDealer } from "@/lib/dealer-session";
import { db } from "@gnd/db";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { dealer } = await requireDealer();
	const decodedSlug = decodeURIComponent(slug).trim();
	const legacyId = Number(decodedSlug);
	const quote = await db.salesOrders.findFirst({
		where: {
			dealerAuthId: dealer.id,
			deletedAt: null,
			type: "quote",
			OR: [
				{ orderId: decodedSlug },
				{ slug: decodedSlug },
				...(Number.isFinite(legacyId) ? [{ id: legacyId }] : []),
			],
		},
		select: {
			id: true,
			orderId: true,
		},
	});

	if (!quote) notFound();
	if (quote.orderId && decodedSlug !== quote.orderId) {
		redirect(`/quotes/${encodeURIComponent(quote.orderId)}/edit`);
	}

	return (
		<DealershipShell dealer={dealer} contentMode="fixed">
			<DealerQuoteComposer mode="edit" quoteId={quote.id} />
		</DealershipShell>
	);
}
