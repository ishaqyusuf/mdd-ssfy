import type { Db, TransactionClient } from "@gnd/db";
import type {
	CustomerTransanctionStatus,
	SalesPaymentMethods,
	SalesPaymentStatus,
} from "../../constants";
import { calculateSalesDueAmount } from "../../sales-transaction";
import type { CustomerTransactionType } from "../../types";
import { buildSalesPaymentRecordedNotificationEvent } from "../contracts";
import { mirrorPostedLegacySalesPayment } from "../infrastructure";

export interface RecordLegacySalesPaymentInput {
	amount: number;
	authorId?: number | null;
	customerTransactionId?: number | null;
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
	if (input.customerTransactionId != null) {
		const salesPayment = await db.salesPayments.create({
			data: {
				transaction: {
					connect: {
						id: input.customerTransactionId,
					},
				},
				amount: input.amount,
				status: input.paymentStatus || ("success" as SalesPaymentStatus),
				orderId: input.salesId,
				squarePaymentsId: input.squarePaymentId || undefined,
				meta: {
					...(input.paymentMeta || {}),
					checkNo: input.checkNo || undefined,
				},
			},
			select: {
				id: true,
				amount: true,
				status: true,
				order: {
					select: {
						id: true,
						customerId: true,
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
		});

		await calculateSalesDueAmount(db, input.salesId);
		await mirrorPostedLegacySalesPayment(db, {
			amount: input.amount,
			customerTransactionId: input.customerTransactionId,
			paymentMethod: input.paymentMethod,
			salesId: input.salesId,
			salesPaymentId: salesPayment.id,
			squarePaymentId: input.squarePaymentId,
			walletId: input.walletId,
		});

		const events =
			salesPayment?.order?.salesRep?.id != null
				? [
						buildSalesPaymentRecordedNotificationEvent({
							amount: salesPayment.amount,
							paymentMethod: input.paymentMethod,
							seed: {
								customerId: salesPayment.order.customerId,
								customerName:
									salesPayment.order.customer?.businessName ||
									salesPayment.order.customer?.name ||
									salesPayment.order.billingAddress?.name ||
									undefined,
								orderNo: salesPayment.order.orderId,
								salesRepEmail: salesPayment.order.salesRep.email,
								salesRepId: salesPayment.order.salesRep.id,
							},
						}),
					]
				: [];

		return {
			customerTransactionId: input.customerTransactionId,
			events,
			salesPayment,
		};
	}

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
							customerId: true,
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
	const salesPayment = transaction.salesPayments[0] || null;
	if (salesPayment) {
		await mirrorPostedLegacySalesPayment(db, {
			amount: input.amount,
			customerTransactionId: transaction.id,
			paymentMethod: input.paymentMethod,
			salesId: input.salesId,
			salesPaymentId: salesPayment.id,
			squarePaymentId: input.squarePaymentId,
			walletId: input.walletId,
		});
	}

	const events =
		salesPayment?.order?.salesRep?.id != null
			? [
					buildSalesPaymentRecordedNotificationEvent({
						amount: salesPayment.amount,
						paymentMethod: input.paymentMethod,
						seed: {
							customerId: salesPayment.order.customerId,
							customerName:
								salesPayment.order.customer?.businessName ||
								salesPayment.order.customer?.name ||
								salesPayment.order.billingAddress?.name ||
								undefined,
							orderNo: salesPayment.order.orderId,
							salesRepEmail: salesPayment.order.salesRep.email,
							salesRepId: salesPayment.order.salesRep.id,
						},
					}),
				]
			: [];

	return {
		customerTransactionId: transaction.id,
		events,
		salesPayment,
	};
}
