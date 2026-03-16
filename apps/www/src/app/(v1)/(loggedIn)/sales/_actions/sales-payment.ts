"use server";

import { prisma } from "@/db";
import { toFixed } from "@/lib/use-number";
import type { ISalesSetting } from "@/types/post";
import {
	deleteLegacySalesPayment,
	recordLegacySalesPayment,
	repairLegacySalesPaymentBalance,
} from "@gnd/sales";

import {
	creditTransaction,
	debitTransaction,
} from "@/app-deps/(v1)/_actions/customer-wallet/transaction";
import { getCustomerWallet } from "@/app-deps/(v1)/_actions/customer-wallet/wallet";
import { getSettingAction } from "@/app-deps/(v1)/_actions/settings";

export interface PaymentOrderProps {
	id;
	amountDue;
	amountPaid;
	grandTotal;
	customerId;
	orderId;
	paymentOption;
	checkNo;
	salesRepId;
}
export interface ApplyPaymentProps {
	orders: PaymentOrderProps[];
	credit;
	debit;
	balance?;
}
export async function applyPaymentAction({
	orders,
	credit,
	debit,
	balance,
}: ApplyPaymentProps) {
	const settings: ISalesSetting = await getSettingAction("sales-settings");

	const wallet = await getCustomerWallet(orders[0]?.customerId);
	await creditTransaction(wallet.id, credit, "credit");

	const transaction = await debitTransaction(
		wallet.id,
		debit,
		`Payment for order: ${orders.map((o) => o.orderId)}`,
	);
	const commissionPercentage = settings?.meta?.commission?.percentage || 0;
	await Promise.all(
		orders.map(async (o) => {
			const commission =
				commissionPercentage > 0
					? (commissionPercentage / 100) * o.grandTotal
					: null;

			const paymentWrite = await recordLegacySalesPayment(prisma, {
				amount: +o.amountPaid,
				customerTransactionId: transaction.id,
				authorId: null,
				walletId: wallet.id,
				paymentMethod: "wallet",
				salesId: o.id,
				transactionType: "transaction",
				checkNo: o.checkNo,
				paymentMeta: {
					paymentOption: o.paymentOption,
				},
			});

			if (commission && paymentWrite.salesPayment) {
				await prisma.salesCommision.create({
					data: {
						amount: commission,
						createdAt: new Date(),
						updatedAt: new Date(),
						status: "",
						user: {
							connect: {
								id: o.salesRepId,
							},
						},
						order: {
							connect: { id: o.id },
						},
						orderPayment: {
							connect: {
								id: paymentWrite.salesPayment.id,
							},
						},
					},
				});
			}
		}),
	);
	return true;
}
export async function deleteSalesPayment({
	id,
	amount,
	orderId,
	amountDue,
	refund,
}) {
	const deletedPayment = await deleteLegacySalesPayment(prisma, {
		salesPaymentId: id,
	});
	const sales = await prisma.salesOrders.findUniqueOrThrow({
		where: {
			id: deletedPayment.orderId,
		},
		include: {
			customer: true,
		},
	});

	const wallet = await getCustomerWallet(sales.customerId);
	await creditTransaction(
		wallet.id,
		refund ? amount : 0,
		refund
			? `Sales Payment deleted and refunded (${sales.orderId})`
			: `Sales Payment deleted with no refund (${sales.orderId}). $${amount}`,
	);
}
export async function fixPaymentAction({
	amountDue,
	id,
}: {
	id: number;
	amountDue: number;
}) {
	await prisma.salesOrders.update({
		where: { id },
		data: {
			amountDue,
		},
	});
}
export async function fixSalesPaymentAction(id) {
	const order = await repairLegacySalesPaymentBalance(prisma, {
		salesId: id,
	});
	const amountDue = order?.amountDue || 0;
	await fixPaymentAction({
		id,
		amountDue: +toFixed(amountDue),
	});
}
export async function updatePaymentTerm(id, paymentTerm, goodUntil) {
	await prisma.salesOrders.update({
		where: { id },
		data: {
			paymentTerm,
			goodUntil,
		},
	});
	// const d = await prisma.salesOrders.findUnique({
	//   where: { id },
	// });
	// if (!d) throw new Error("Order Not Found");
	// const meta: ISalesOrderMeta = d.meta as any;
	// meta.pa
}
