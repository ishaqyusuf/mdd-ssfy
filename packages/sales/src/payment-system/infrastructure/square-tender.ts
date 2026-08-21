import type { Database, TransactionClient } from "@gnd/db";

type SquareTenderDb = Pick<Database | TransactionClient, "squareTenderPayment">;

export type VerifiedSquareTender = {
	providerPaymentId: string;
	legacySquarePaymentId?: string | null;
	checkoutId?: string | null;
	providerOrderId?: string | null;
	source: "link" | "terminal" | "reconciliation";
	status: string;
	amountCents: number;
	tipCents?: number;
	currency?: string;
	locationId?: string | null;
	paidAt?: Date | null;
	processingFeeCents?: number;
	verificationSource: string;
};

export async function captureVerifiedSquareTender(
	db: SquareTenderDb,
	input: VerifiedSquareTender,
) {
	return db.squareTenderPayment.upsert({
		where: { providerPaymentId: input.providerPaymentId },
		create: {
			providerPaymentId: input.providerPaymentId,
			legacySquarePaymentId: input.legacySquarePaymentId,
			checkoutId: input.checkoutId,
			providerOrderId: input.providerOrderId,
			source: input.source,
			status: input.status,
			amountCents: input.amountCents,
			locationId: input.locationId,
			paidAt: input.paidAt,
			verificationSource: input.verificationSource,
			currency: input.currency || "USD",
			tipCents: input.tipCents || 0,
			meta:
				input.processingFeeCents == null
					? undefined
					: { processingFeeCents: input.processingFeeCents },
			verifiedAt: new Date(),
		},
		update: {
			legacySquarePaymentId: input.legacySquarePaymentId,
			checkoutId: input.checkoutId,
			providerOrderId: input.providerOrderId,
			status: input.status,
			amountCents: input.amountCents,
			tipCents: input.tipCents || 0,
			currency: input.currency || "USD",
			locationId: input.locationId,
			paidAt: input.paidAt,
			verificationSource: input.verificationSource,
			meta:
				input.processingFeeCents == null
					? undefined
					: { processingFeeCents: input.processingFeeCents },
			verifiedAt: new Date(),
		},
	});
}
