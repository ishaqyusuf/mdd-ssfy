import type { Db, TransactionClient } from "@gnd/db";
import type {
	CustomerTransanctionStatus,
	SalesPaymentMethods,
	SalesPaymentStatus,
} from "../../constants";
import { calculateSalesDueAmount } from "../../sales-transaction";
import type { CustomerTransactionType } from "../../types";

export interface RecordLegacySalesPaymentInput {
	amount: number;
	authorId?: number | null;
	walletId: number;
	paymentMethod: SalesPaymentMethods;
	salesId: number;
	transactionType: CustomerTransactionType;
	checkNo?: string | null;
	squarePaymentId?: string | null;
	transactionStatus?: CustomerTransanctionStatus;
	paymentStatus?: SalesPaymentStatus;
	transactionMeta?: Record<string, unknown> | null;
	paymentMeta?: Record<string, unknown> | null;
}

export async function recordLegacySalesPayment(
	db: Db | TransactionClient,
	input: RecordLegacySalesPaymentInput,
) {
	const transaction = await db.customerTransaction.create({
		data: {
			amount: input.amount,
			wallet: {
				connect: {
					id: input.walletId,
				},
			},
			paymentMethod: input.paymentMethod,
			status:
				input.transactionStatus || ("success" as CustomerTransanctionStatus),
			meta: {
				...(input.transactionMeta || {}),
				checkNo: input.checkNo || undefined,
			},
			type: input.transactionType,
			author:
				input.authorId != null
					? {
							connect: {
								id: input.authorId,
							},
						}
					: undefined,
			squarePayment: input.squarePaymentId
				? {
						connect: {
							id: input.squarePaymentId,
						},
					}
				: undefined,
			salesPayments: {
				create: {
					meta: {
						...(input.paymentMeta || {}),
						checkNo: input.checkNo || undefined,
					},
					amount: input.amount,
					status: input.paymentStatus || ("success" as SalesPaymentStatus),
					orderId: input.salesId,
					squarePaymentsId: input.squarePaymentId || undefined,
				},
			},
		},
		select: {
			id: true,
			salesPayments: {
				select: {
					id: true,
					amount: true,
					status: true,
					order: {
						select: {
							id: true,
							orderId: true,
							customer: {
								select: {
									name: true,
									businessName: true,
								},
							},
							billingAddress: {
								select: {
									name: true,
								},
							},
							salesRep: {
								select: {
									id: true,
									email: true,
									name: true,
								},
							},
						},
					},
				},
			},
		},
	});

	await calculateSalesDueAmount(db, input.salesId);

	return {
		customerTransactionId: transaction.id,
		salesPayment: transaction.salesPayments[0] || null,
	};
}
