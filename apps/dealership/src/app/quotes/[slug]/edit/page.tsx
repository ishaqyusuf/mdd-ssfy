import { DealerQuoteComposer } from "@/components/dealer-sales-form/dealer-quote-composer";
import { DealershipShell } from "@/components/dealership-shell";
import { requireDealer } from "@/lib/dealer-session";
import { db } from "@gnd/db";
import {
	DEALER_ORDER_REQUEST_TYPE,
	getDealerQuoteEditLock,
} from "@gnd/db/queries";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
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
			requests: {
				where: {
					request: DEALER_ORDER_REQUEST_TYPE,
					deletedAt: null,
				},
				orderBy: {
					createdAt: "desc",
				},
				take: 1,
				select: {
					status: true,
				},
			},
		},
	});

	if (!quote) notFound();
	if (quote.orderId && decodedSlug !== quote.orderId) {
		redirect(`/quotes/${encodeURIComponent(quote.orderId)}/edit`);
	}
	const editLock = getDealerQuoteEditLock(quote.requests[0]?.status);

	return (
		<DealershipShell dealer={dealer} contentMode="fixed">
			{editLock.locked ? (
				<section
					className="mx-auto mt-10 w-full max-w-2xl rounded-xl border bg-background p-6 shadow-sm"
					aria-labelledby="locked-quote-title"
				>
					<div className="text-sm font-medium text-muted-foreground">
						Quote {quote.orderId}
					</div>
					<h1 id="locked-quote-title" className="mt-2 text-2xl font-semibold">
						Quote locked for editing
					</h1>
					<p className="mt-3 text-sm text-muted-foreground">
						{editLock.reason}
					</p>
					<div className="mt-6">
						<Button asChild>
							<Link href="/quotes">Back to dealer quotes</Link>
						</Button>
					</div>
				</section>
			) : (
				<DealerQuoteComposer mode="edit" quoteId={quote.id} />
			)}
		</DealershipShell>
	);
}
