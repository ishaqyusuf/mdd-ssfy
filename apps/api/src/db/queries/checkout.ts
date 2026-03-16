import type { TRPCContext } from "@api/trpc/init";
import type { TransactionClient } from "@gnd/db";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import {
	applyLegacySalesCheckoutSettlement,
	createPendingLegacySalesCheckout,
	linkLegacySalesCheckoutSquareOrder,
	resolveSalesCheckoutToken,
} from "@gnd/sales";
import type {
	PaymentSystemNotificationEvent,
	SalesCheckoutSuccessNotificationPayload,
} from "@gnd/sales";
import { SQUARE_LOCATION_ID, squareClient } from "@gnd/square";
import { timeout } from "@gnd/utils";
import { getAppUrl } from "@gnd/utils/envs";
import type {
	CustomerTransanctionStatus,
	SalesPaymentMethods,
	SalesPaymentStatus,
} from "@sales/constants";
import type { CustomerTransactionType } from "@sales/types";
import { tasks } from "@trigger.dev/sdk/v3";
import z from "zod";
import { createPayrollAction, getOrders } from "./sales";
import type { SquarePaymentStatus } from "./sales-accounting";
export const initializeCheckoutSchema = z.object({
	token: z.string(),
});
export type InitializeCheckoutSchema = z.infer<typeof initializeCheckoutSchema>;

export async function initializeCheckout(
	ctx: TRPCContext,
	query: InitializeCheckoutSchema,
) {
	const { db } = ctx;
	const payload = resolveSalesCheckoutToken(query.token);
	const sales = await getOrders(ctx, {
		salesIds: payload?.salesIds,
		// invoice: "pending",
	});
	await timeout(1000);

	return {
		payload,
		sales: sales?.data?.filter((a) => a.due > 0),
		customerName: sales?.data?.[0]?.displayName,
	};
}

export const createSalesCheckoutLinkSchema = z.object({
	token: z.string(),
});
export type CreateSalesCheckoutLinkSchema = z.infer<
	typeof createSalesCheckoutLinkSchema
>;

export async function createSalesCheckoutLink(
	ctx: TRPCContext,
	data: CreateSalesCheckoutLinkSchema,
) {
	const { db } = ctx;
	const checkoutData = await initializeCheckout(ctx, {
		token: data.token,
	});
	const payload = checkoutData.payload;

	return db.$transaction(async (tx) => {
		const sales = checkoutData?.sales;
		if (!sales?.length) {
			throw new Error("No payable sales found for checkout");
		}
		const amount = payload.amount || 0;
		if (!SQUARE_LOCATION_ID) {
			throw new Error("Square location is not configured");
		}

		const cust = sales.find((a) => !!a.email && !!a.displayName);
		const phone = checkoutData?.sales
			?.map((a) => a.customerPhone)
			?.filter(Boolean)?.[0];
		let phoneNo = phone?.replaceAll("-", "");
		if (!phoneNo?.startsWith("+")) phoneNo = `+1${phoneNo}`;
		const pendingCheckout = await createPendingLegacySalesCheckout(tx, {
			amount,
			orders: checkoutData.sales.map((order) => ({
				id: order.id,
				orderId: order.orderId,
				amountDue: order.due,
				customerId: order.customerId,
				salesRepId: order.salesRepId,
				accountNo: order.accountNo,
				customerPhone: order.customerPhone,
				email: order.email,
				displayName: order.displayName,
				address: cust?.address,
			})),
			paymentMethod: "link" as SalesPaymentMethods,
			tokenPayload: payload,
		});
		const redirectUrl = `${getAppUrl()}/checkout/${pendingCheckout.redirectToken}`;
		const buyerEmail = cust?.email;
		try {
			const resp = await squareClient.checkout.paymentLinks.create({
				idempotencyKey: new Date().toISOString(),
				quickPay: {
					locationId: SQUARE_LOCATION_ID,
					name: squareSalesNote(checkoutData.sales.map((a) => a.orderId)),
					priceMoney: {
						amount: BigInt(Math.round(amount * 100)),
						currency: "USD",
					},
				},
				prePopulatedData: {
					buyerEmail,
					buyerPhoneNumber: phoneNo,
					buyerAddress: {
						addressLine1: cust?.address,
					},
				},
				checkoutOptions: {
					redirectUrl,
					askForShippingAddress: false,
					allowTipping: false,
				},
			});

			// const paymentId = tx.squarePayment.paymentId;
			// const { result, statusCode, body: _body } = resp;
			const { paymentLink } = resp;
			await linkLegacySalesCheckoutSquareOrder(tx, {
				squarePaymentId: pendingCheckout.squarePaymentId,
				squareOrderId: paymentLink?.orderId,
			});
			// const paymentLink = result.paymentLink;
			return {
				paymentLink: paymentLink?.url,
			};
		} catch (error) {
			if (error instanceof Error) throw new Error(error.message);
		}
	});
}

export function squareSalesNote(orderIds: string[]) {
	return `sales payment for order${
		orderIds.length > 1 ? "s" : ""
	} ${orderIds.join(", ")}`;
}

export const verifyPaymentSchema = z.object({
	paymentId: z.string(),
	walletId: z.number(),
	attempts: z.number().default(1).optional().nullable(),
});
export type VerifyPaymentSchema = z.infer<typeof verifyPaymentSchema>;

let salesRepsNotifications: Record<
	string,
	PaymentSystemNotificationEvent<SalesCheckoutSuccessNotificationPayload>
>;
export async function verifyPayment(
	ctx: TRPCContext,
	query: VerifyPaymentSchema,
): Promise<{
	amount?: number;
	tip?: number | null;
	status?: SquarePaymentStatus | "error";
	notifications?: PaymentSystemNotificationEvent<SalesCheckoutSuccessNotificationPayload>[];
}> {
	salesRepsNotifications = {};
	const attempts = query.attempts || 1;
	if (attempts > 2)
		return {
			status: "error",
		};
	const { db } = ctx;
	const result = await db.$transaction(async (tx) => {
		const squarePayment = await tx.squarePayments.findFirstOrThrow({
			where: {
				id: query.paymentId,
			},
			include: {
				customerTxs: {},
				orders: {
					select: {
						order: {
							select: {
								amountDue: true,
								id: true,
								customerId: true,
								salesRepId: true,
							},
						},
					},
				},
				checkout: {
					include: {
						// order: true,
						tenders: true,
					},
				},
			},
		});
		if (squarePayment?.customerTxs?.length)
			return {
				status: "COMPLETED",
			};
		const checkout = squarePayment.checkout;
		if (!squarePayment.squareOrderId || !checkout?.id) {
			return {
				status: "PENDING",
			};
		}

		// const meta = checkout?.meta as any;
		// const {
		//     result: {
		//         order: { id: orderId, tenders },
		//     },
		// } = await squareClient.ordersApi.retrieveOrder(meta.squareOrderId);
		const { errors, order } = await squareClient.orders.get({
			orderId: squarePayment.squareOrderId,
		});
		const tenders = order?.tenders || [];

		const resp: {
			amount: number;
			tip: number | null;
			status: SquarePaymentStatus;
		} = {
			amount: 0,
			tip: null,
			status: "PENDING",
		};
		await Promise.all(
			tenders.map(async (tender) => {
				// const {
				//     result: { payment },
				// } = await squareClient.paymentsApi.getPayment(tender.paymentId);
				if (!tender.paymentId) return;
				const payment = (
					await squareClient.payments.get({
						paymentId: tender.paymentId,
					})
				)?.payment;
				if (!payment) return;
				//   payment.payment.tim
				const tip = payment.tipMoney?.amount;
				resp.status = payment.status as SquarePaymentStatus;
				if (resp.status === "COMPLETED") {
					resp.amount += Number(payment.amountMoney?.amount || 0) / 100;
					const t = Number(tip);
					resp.tip = t > 0 ? t / 100 : 0;
				}
			}),
		);

		if (resp.amount > 0)
			await paymentSuccess(
				{
					// ...checkout,
					walletId: query.walletId,
					checkoutId: checkout.id,
					squarePaymentId: squarePayment.id,
					orders: squarePayment?.orders
						?.map((a) => a.order)
						.filter(Boolean)
						.map((a) => ({
							...a,
						})), //.[0]?.order,
					tip: resp.tip,
					// amount: checkout?.amount || squarePayment.amount,
					amount: resp.amount,
				},
				tx,
			);
		return {
			...resp,
			notifications: Object.values(salesRepsNotifications || {}),
		};
	});
	const notifications =
		"notifications" in result ? result.notifications || [] : [];
	if (result.status === "COMPLETED") {
		await sendPaymentSystemNotifications(tasks, ctx, notifications);
	}
	return result;
}
export async function paymentSuccess(
	p: {
		squarePaymentId;
		walletId;
		amount;
		tip;
		orders: { id; customerId; amountDue; salesRepId }[];
		checkoutId;
	},
	tx: TransactionClient,
) {
	const settlement = await applyLegacySalesCheckoutSettlement(tx, {
		amount: p.amount,
		checkoutId: p.checkoutId,
		paymentMethod: "link" as SalesPaymentMethods,
		squarePaymentId: p.squarePaymentId,
		tip: p.tip,
		transactionType: "transaction" as CustomerTransactionType,
		transactionStatus: "success" as CustomerTransanctionStatus,
		paymentStatus: "success" as SalesPaymentStatus,
		walletId: p.walletId,
		orders: p.orders,
		onPaymentApplied: async ({
			orderId,
			salesAmount,
			salesPaymentId,
			salesRepId,
		}) => {
			await createPayrollAction(
				{
					orderId,
					userId: salesRepId,
					salesPaymentId,
					salesAmount,
				},
				tx,
			);
		},
	});
	for (const event of settlement.events) {
		salesRepsNotifications[
			event.recipientEmail || `${event.recipientEmployeeId}`
		] = event;
	}
}

/*

*/
export const generateDeviceCodeSchema = z.object({
	// : z.string(),
});
export type GenerateDeviceCodeSchema = z.infer<typeof generateDeviceCodeSchema>;

export async function generateDeviceCode(
	ctx: TRPCContext,
	query: GenerateDeviceCodeSchema,
) {
	const { db } = ctx;
	const resp = await squareClient.devices.codes.create({
		idempotencyKey: generateRandomString(),

		deviceCode: {
			locationId: process.env.SQUARE_LOCATION_ID,
			productType: "TERMINAL_API",
			name: "GND-MILLWORK-1451",
		},
	});
	return resp?.deviceCode;
}
