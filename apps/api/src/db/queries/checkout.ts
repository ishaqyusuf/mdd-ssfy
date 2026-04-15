import type { TRPCContext } from "@api/trpc/init";
import { Prisma, type TransactionClient } from "@gnd/db";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { NotificationService } from "@gnd/notifications/services/triggers";
import {
	type PaymentSystemNotificationEvent,
	type SalesCheckoutSuccessNotificationPayload,
	applyLegacySalesCheckoutSettlement,
	createPendingLegacySalesCheckout,
	linkLegacySalesCheckoutSquareOrder,
	resolveSalesCheckoutToken,
} from "@gnd/sales/payment-system";
import { generateSalesSlug } from "@gnd/sales/utils";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { SQUARE_LOCATION_ID, squareClient } from "@gnd/square";
import { timeout } from "@gnd/utils";
import { getAppUrl } from "@gnd/utils/envs";
import {
	type SalesPaymentTokenSchema,
	quoteAcceptanceTokenSchema,
	tokenize,
	validateToken,
} from "@gnd/utils/tokenizer";
import type {
	CustomerTransanctionStatus,
	SalesPaymentMethods,
	SalesPaymentStatus,
} from "@sales/constants";
import type { CustomerTransactionType, SalesType } from "@sales/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { addDays } from "date-fns";
import z from "zod";
import { createPayrollAction, getOrders } from "./sales";
import type { SquarePaymentStatus } from "./sales-accounting";

function isTokenExpired(expiry?: string | null) {
	if (!expiry) return true;
	const date = new Date(expiry);
	if (Number.isNaN(date.getTime())) return true;
	return date.getTime() < Date.now();
}

function resolveQuoteAcceptanceToken(token: string) {
	return validateToken(token, quoteAcceptanceTokenSchema);
}

async function buildFullPaymentToken(
	ctx: TRPCContext,
	data: {
		salesId: number;
		customerId?: number | null;
		customerPhone?: string | null;
		amountDue?: number | null;
	},
) {
	const amountDue = Number(data.amountDue || 0);
	if (amountDue <= 0) return null;
	const accountNo =
		data.customerPhone || (data.customerId ? `cust-${data.customerId}` : null);
	if (!accountNo) return null;
	const wallet = await getCustomerWallet(ctx.db, accountNo);
	if (!wallet?.id) return null;

	return tokenize({
		salesIds: [data.salesId],
		expiry: addDays(new Date(), 7).toISOString(),
		payPlan: "full",
		amount: amountDue,
		walletId: wallet.id,
	} satisfies SalesPaymentTokenSchema);
}
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

export const initializeQuoteAcceptanceSchema = z.object({
	orderId: z.string(),
	token: z.string(),
});
export type InitializeQuoteAcceptanceSchema = z.infer<
	typeof initializeQuoteAcceptanceSchema
>;

export async function initializeQuoteAcceptance(
	ctx: TRPCContext,
	query: InitializeQuoteAcceptanceSchema,
) {
	const payload = resolveQuoteAcceptanceToken(query.token);
	if (!payload || payload.orderId !== query.orderId) {
		throw new Error("This quote acceptance link is invalid.");
	}
	if (isTokenExpired(payload.expiry)) {
		throw new Error("This quote acceptance link has expired.");
	}

	const sale = await ctx.db.salesOrders.findFirst({
		where: {
			id: payload.salesId,
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
			type: true,
			status: true,
			grandTotal: true,
			amountDue: true,
			customerId: true,
			salesRepId: true,
			customer: {
				select: {
					name: true,
					businessName: true,
					phoneNo: true,
					email: true,
				},
			},
			billingAddress: {
				select: {
					name: true,
					email: true,
				},
			},
			salesRep: {
				select: {
					name: true,
					email: true,
				},
			},
			meta: true,
		},
	});

	if (!sale) {
		throw new Error("This quote could not be found.");
	}

	const meta = (sale.meta || {}) as Record<string, unknown>;
	const acceptanceMeta = (meta.quoteAcceptance || {}) as Record<
		string,
		unknown
	>;
	const originalQuoteOrderId = String(
		acceptanceMeta.originalQuoteOrderId || payload.orderId,
	);
	const canViewAcceptedOrder =
		sale.type === "order" && originalQuoteOrderId === payload.orderId;

	if (sale.type !== "quote" && !canViewAcceptedOrder) {
		throw new Error("This quote is no longer available for acceptance.");
	}

	const paymentToken =
		sale.type === "order"
			? await buildFullPaymentToken(ctx, {
					salesId: sale.id,
					customerId: sale.customerId,
					customerPhone: sale.customer?.phoneNo,
					amountDue: sale.amountDue,
				})
			: null;

	return {
		payload,
		sale: {
			id: sale.id,
			orderId: sale.orderId,
			originalQuoteOrderId,
			type: sale.type,
			status: sale.status,
			total: Number(sale.grandTotal || 0),
			due: Number(sale.amountDue || 0),
			customerName:
				sale.customer?.businessName ||
				sale.customer?.name ||
				sale.billingAddress?.name ||
				"Customer",
			customerEmail: sale.customer?.email || sale.billingAddress?.email || null,
			salesRep: sale.salesRep?.name || "Sales Rep",
			salesRepEmail: sale.salesRep?.email || null,
			acceptedAt:
				typeof acceptanceMeta.acceptedAt === "string"
					? acceptanceMeta.acceptedAt
					: null,
			paymentToken,
		},
	};
}

export const acceptQuoteSchema = z.object({
	orderId: z.string(),
	token: z.string(),
});
export type AcceptQuoteSchema = z.infer<typeof acceptQuoteSchema>;

export async function acceptQuote(ctx: TRPCContext, data: AcceptQuoteSchema) {
	const query = acceptQuoteSchema.parse(data);
	const payload = resolveQuoteAcceptanceToken(query.token);
	if (!payload || payload.orderId !== query.orderId) {
		throw new Error("This quote acceptance link is invalid.");
	}
	if (isTokenExpired(payload.expiry)) {
		throw new Error("This quote acceptance link has expired.");
	}

	const result = await ctx.db.$transaction(async (tx) => {
		const sale = await tx.salesOrders.findFirst({
			where: {
				id: payload.salesId,
				deletedAt: null,
			},
			select: {
				id: true,
				orderId: true,
				type: true,
				status: true,
				salesRepId: true,
				customerId: true,
				amountDue: true,
				meta: true,
				customer: {
					select: {
						name: true,
						businessName: true,
						phoneNo: true,
						email: true,
					},
				},
				billingAddress: {
					select: {
						name: true,
						email: true,
					},
				},
				salesRep: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});

		if (!sale) {
			throw new Error("This quote could not be found.");
		}

		const meta = (sale.meta || {}) as Record<string, unknown>;
		const acceptanceMeta = (meta.quoteAcceptance || {}) as Record<
			string,
			unknown
		>;
		const originalQuoteOrderId = String(
			acceptanceMeta.originalQuoteOrderId || payload.orderId,
		);
		if (sale.type === "order") {
			const paymentToken = await buildFullPaymentToken(ctx, {
				salesId: sale.id,
				customerId: sale.customerId,
				customerPhone: sale.customer?.phoneNo,
				amountDue: sale.amountDue,
			});
			return {
				ok: true,
				alreadyAccepted: true,
				order: {
					salesId: sale.id,
					orderId: sale.orderId,
					originalQuoteOrderId,
					customerName:
						sale.customer?.businessName ||
						sale.customer?.name ||
						sale.billingAddress?.name ||
						"Customer",
					salesRep: sale.salesRep?.name || "Sales Rep",
					due: Number(sale.amountDue || 0),
					status: sale.status || "Active",
					paymentToken,
				},
				notify: null,
			};
		}

		if (sale.type !== "quote" || sale.orderId !== payload.orderId) {
			throw new Error("This quote is no longer available for acceptance.");
		}

		const nextSalesType: SalesType = "order";
		const newOrderId = await generateSalesSlug(
			nextSalesType,
			tx.salesOrders,
			sale.salesRep?.name || "",
		);
		const acceptedAt = new Date().toISOString();
		const updated = await tx.salesOrders.update({
			where: {
				id: sale.id,
			},
			data: {
				type: "order",
				status: "Active",
				orderId: newOrderId,
				slug: `order-${newOrderId.toLowerCase()}`,
				meta: {
					...meta,
					quoteAcceptance: {
						...acceptanceMeta,
						acceptedAt,
						originalQuoteOrderId: payload.orderId,
						acceptedFrom: "public-link",
					},
				} as Prisma.InputJsonValue,
			},
			select: {
				id: true,
				orderId: true,
				status: true,
				amountDue: true,
				customerId: true,
				customer: {
					select: {
						name: true,
						businessName: true,
						phoneNo: true,
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
						name: true,
					},
				},
			},
		});

		const paymentToken = await buildFullPaymentToken(ctx, {
			salesId: updated.id,
			customerId: updated.customerId,
			customerPhone: updated.customer?.phoneNo,
			amountDue: updated.amountDue,
		});

		return {
			ok: true,
			alreadyAccepted: false,
			order: {
				salesId: updated.id,
				orderId: updated.orderId,
				originalQuoteOrderId: payload.orderId,
				customerName:
					updated.customer?.businessName ||
					updated.customer?.name ||
					updated.billingAddress?.name ||
					"Customer",
				salesRep: updated.salesRep?.name || "Sales Rep",
				due: Number(updated.amountDue || 0),
				status: updated.status || "Active",
				acceptedAt,
				paymentToken,
			},
			notify: {
				recipients: updated.salesRep?.id ? [updated.salesRep.id] : [],
				author: sale.customerId
					? ({
							id: sale.customerId,
							role: "customer",
						} as const)
					: ({
							id: sale.salesRepId || updated.salesRep?.id || 1,
							role: "employee",
						} as const),
				payload: {
					salesId: updated.id,
					orderNo: updated.orderId,
					quoteNo: payload.orderId,
					customerName:
						updated.customer?.businessName ||
						updated.customer?.name ||
						updated.billingAddress?.name ||
						"Customer",
					acceptedAt,
				},
			},
		};
	});
	if (!result.alreadyAccepted && result.notify) {
		const notificationService = new NotificationService(tasks, ctx);
		if (result.notify.recipients.length) {
			notificationService.setEmployeeRecipients(...result.notify.recipients);
		}
		await notificationService.send("quote_accepted", {
			author: result.notify.author,
			payload: result.notify.payload,
		});
	}
	const { notify: _notify, ...response } = result;
	return response;
}

export const createSalesCheckoutLinkSchema = z.object({
	token: z.string(),
	amount: z.number().positive().optional().nullable(),
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
		const totalDue = sales.reduce(
			(sum, order) => sum + Number(order.due || 0),
			0,
		);
		const amount =
			payload.payPlan === "flexible"
				? Number(data.amount || 0)
				: Number(payload.amount || 0);
		if (!SQUARE_LOCATION_ID) {
			throw new Error("Square location is not configured");
		}
		if (payload.payPlan === "flexible" && amount <= 0) {
			throw new Error("Enter an amount to continue");
		}
		if (amount <= 0) {
			throw new Error("Checkout amount is invalid");
		}
		if (amount > totalDue) {
			throw new Error("Amount cannot exceed the outstanding balance");
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
		const redirectUrl = `${getAppUrl()}/checkout/${pendingCheckout.redirectToken}/v2`;
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
	const result = await db
		.$transaction(
			async (tx) => {
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
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		)
		.catch((e) => {
			// P2034: transaction conflict under Serializable isolation — another
			// concurrent request already processed this payment successfully.
			if (e?.code === "P2034") return { status: "COMPLETED" as const };
			throw e;
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
