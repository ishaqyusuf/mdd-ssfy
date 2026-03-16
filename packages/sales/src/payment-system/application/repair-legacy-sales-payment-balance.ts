import type { Db, TransactionClient } from "@gnd/db";
import { calculateSalesDueAmount } from "../../sales-transaction";
import { syncCanonicalPaymentProjection } from "../infrastructure";

export interface RepairLegacySalesPaymentBalanceInput {
	salesId: number;
}

export async function repairLegacySalesPaymentBalance(
	db: Db | TransactionClient,
	input: RepairLegacySalesPaymentBalanceInput,
) {
	await calculateSalesDueAmount(db, input.salesId);
	await syncCanonicalPaymentProjection(db, {
		salesId: input.salesId,
	});

	return db.salesOrders.findUnique({
		where: {
			id: input.salesId,
		},
		select: {
			id: true,
			grandTotal: true,
			amountDue: true,
		},
	});
}
