import type { Db, TransactionClient } from "@gnd/db";
import { calculateSalesDueAmount } from "../../sales-transaction";

export interface DeleteLegacySalesPaymentInput {
	salesPaymentId: number;
}

export async function deleteLegacySalesPayment(
	db: Db | TransactionClient,
	input: DeleteLegacySalesPaymentInput,
) {
	const payment = await db.salesPayments.findUniqueOrThrow({
		where: {
			id: input.salesPaymentId,
		},
		select: {
			id: true,
			orderId: true,
			amount: true,
			transactionId: true,
		},
	});

	await db.salesPayments.delete({
		where: {
			id: input.salesPaymentId,
		},
	});

	await calculateSalesDueAmount(db, payment.orderId);

	return payment;
}
