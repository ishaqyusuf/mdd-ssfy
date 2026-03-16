import type { Db, TransactionClient } from "@gnd/db";
import type {
	CustomerTransanctionStatus,
	SalesPaymentMethods,
	SalesPaymentStatus,
} from "../../constants";
import type { CustomerTransactionType } from "../../types";
import { buildSalesCheckoutSuccessNotificationEvent } from "../contracts";
import type {
	SalesCheckoutNotificationSeed,
	SalesCheckoutOrderSummary,
} from "../contracts/checkout";
import { recordLegacySalesPayment } from "./record-legacy-sales-payment";

export interface ApplyLegacySalesCheckoutSettlementInput {
	amount: number;
	checkoutId: string;
	paymentMethod: SalesPaymentMethods;
	squarePaymentId: string;
	tip?: number | null;
	transactionType: CustomerTransactionType;
	transactionStatus: CustomerTransanctionStatus;
	paymentStatus: SalesPaymentStatus;
	walletId: number;
	orders: Array<
		Pick<
			SalesCheckoutOrderSummary,
			"amountDue" | "customerId" | "id" | "salesRepId"
		>
	>;
	onPaymentApplied?: (input: {
		orderId: number;
		salesAmount: number;
		salesPaymentId: number;
		salesRepId: number;
	}) => Promise<void>;
}

export async function applyLegacySalesCheckoutSettlement(
	db: Db | TransactionClient,
	input: ApplyLegacySalesCheckoutSettlementInput,
) {
	let balance = input.amount;
	const notificationsByEmail = new Map<string, SalesCheckoutNotificationSeed>();

	for (const order of input.orders) {
		const payAmount = balance > order.amountDue ? order.amountDue : balance;
		balance -= payAmount;

		const paymentWrite = await recordLegacySalesPayment(db, {
			amount: payAmount,
			walletId: input.walletId,
			paymentMethod: input.paymentMethod,
			salesId: order.id,
			transactionType: input.transactionType,
			squarePaymentId: input.squarePaymentId,
			transactionStatus: input.transactionStatus,
			paymentStatus: input.paymentStatus,
		});
		const salesPayment = paymentWrite.salesPayment;
		if (!salesPayment?.order) continue;

		await input.onPaymentApplied?.({
			orderId: order.id,
			salesAmount: salesPayment.amount,
			salesPaymentId: salesPayment.id,
			salesRepId: order.salesRepId,
		});

		const salesRep = salesPayment.order.salesRep;
		if (!salesRep?.email) continue;
		if (!notificationsByEmail.has(salesRep.email)) {
			notificationsByEmail.set(salesRep.email, {
				email: salesRep.email,
				amount: 0,
				customerId: order.customerId ?? null,
				customerName:
					salesPayment.order.customer?.businessName ||
					salesPayment.order.customer?.name ||
					salesPayment.order.billingAddress?.name ||
					undefined,
				ordersNo: [],
				salesRepId: order.salesRepId,
			});
		}
		const notification = notificationsByEmail.get(salesRep.email);
		if (!notification) continue;
		notification.amount += salesPayment.amount;
		notification.ordersNo.push(salesPayment.order.orderId);
	}

	await db.salesCheckout.update({
		where: {
			id: input.checkoutId,
		},
		data: {
			tip: input.tip,
			status: "success",
		},
	});

	return {
		events: Array.from(notificationsByEmail.values()).map((notification) =>
			buildSalesCheckoutSuccessNotificationEvent({
				amount: notification.amount,
				customerId: notification.customerId,
				customerName: notification.customerName,
				orderNos: notification.ordersNo,
				recipientEmployeeId: notification.salesRepId,
				recipientEmail: notification.email,
			}),
		),
		notifications: Array.from(notificationsByEmail.values()),
	};
}
