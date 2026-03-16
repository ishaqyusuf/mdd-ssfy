import type { Db, TransactionClient } from "@gnd/db";

export interface LinkLegacySalesCheckoutSquareOrderInput {
	squarePaymentId: string;
	squareOrderId?: string | null;
}

export async function linkLegacySalesCheckoutSquareOrder(
	db: Db | TransactionClient,
	input: LinkLegacySalesCheckoutSquareOrderInput,
) {
	return db.squarePayments.update({
		where: {
			id: input.squarePaymentId,
		},
		data: {
			squareOrderId: input.squareOrderId || undefined,
		},
	});
}
