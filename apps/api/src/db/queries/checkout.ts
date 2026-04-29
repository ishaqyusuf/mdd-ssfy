import type { TRPCContext } from "@api/trpc/init";
import { Prisma, type TransactionClient } from "@gnd/db";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { NotificationService } from "@gnd/notifications/services/triggers";
import {
	buildSalesCustomerPaymentFailedPayload,
	buildSalesCustomerPaymentReceivedPayload,
} from "@gnd/notifications/types/sales-customer-payment-utils";
import {
	type PaymentSystemNotificationEvent,
	type SalesCheckoutSuccessNotificationPayload,
	applyLegacySalesCheckoutSettlement,
	createPendingLegacySalesCheckout,
	linkLegacySalesCheckoutSquareOrder,
	resolveSalesCheckoutToken,
} from "@gnd/sales/payment-system";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { SQUARE_LOCATION_ID, squareClient } from "@gnd/square";
import { generateRandomString, timeout } from "@gnd/utils";
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
import { copySales } from "@sales/copy-sales";
import type { CustomerTransactionType } from "@sales/types";
import { resolveReminderAmount } from "@sales/utils/reminder-pay-plan";
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

function normalizeBuyerPhoneNumber(phoneNo?: string | null): string | null {
	if (!phoneNo) return null;
	const raw = phoneNo.trim();
	if (!raw) return null;

	if (raw.startsWith("+")) {
		const digits = raw.slice(1).replace(/\D/g, "");
		if (digits.length < 8 || digits.length > 15) return null;
		return `+${digits}`;
	}

	const digits = raw.replace(/\D/g, "");
	if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
	return null;
}

function resolveQuoteAcceptanceToken(token: string) {
	return validateToken(token, quoteAcceptanceTokenSchema);
}

const quoteAcceptanceSaleSelect = {
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
			id: true,
			name: true,
			email: true,
		},
	},
	meta: true,
} as const;

const quoteAcceptanceOrderSelect = {
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
	meta: true,
} as const;

function getQuoteAcceptanceCustomerName(data: {
	customer?: {
		businessName?: string | null;
		name?: string | null;
	} | null;
	billingAddress?: {
		name?: string | null;
	} | null;
}) {
	return (
		data.customer?.businessName ||
		data.customer?.name ||
		data.billingAddress?.name ||
		"Customer"
	);
}

function getQuoteAcceptanceSalesRep(data: {
	salesRep?: {
		name?: string | null;
		email?: string | null;
		id?: number | null;
	} | null;
}) {
	return {
		name: data.salesRep?.name || "Sales Rep",
		email: data.salesRep?.email || null,
		id: data.salesRep?.id || null,
	};
}

async function getAcceptedQuoteOrder(
	tx: TRPCContext["db"] | TransactionClient,
	orderId: string | null | undefined,
	originalQuoteOrderId: string,
) {
	if (!orderId) return null;

	const order = await tx.salesOrders.findFirst({
		where: {
			orderId,
			type: "order",
			deletedAt: null,
		},
		select: quoteAcceptanceOrderSelect,
	});

	if (!order) return null;

	const meta = (order.meta || {}) as Record<string, unknown>;
	const acceptanceMeta = (meta.quoteAcceptance || {}) as Record<
		string,
		unknown
	>;
	return acceptanceMeta.originalQuoteOrderId === originalQuoteOrderId
		? order
		: null;
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
	const sales = payload?.salesIds?.length
		? await db.salesOrders.findMany({
				where: {
					id: {
						in: payload.salesIds,
					},
					type: "order",
					deletedAt: null,
				},
				select: {
					id: true,
					orderId: true,
					amountDue: true,
					customerId: true,
					salesRepId: true,
					customer: {
						select: {
							businessName: true,
							name: true,
							email: true,
							phoneNo: true,
						},
					},
					billingAddress: {
						select: {
							name: true,
							email: true,
							address1: true,
							phoneNo: true,
						},
					},
					shippingAddress: {
						select: {
							name: true,
							address1: true,
							phoneNo: true,
						},
					},
				},
			})
		: [];
	await timeout(1000);

	return {
		payload,
		sales: sales
			.map((sale) => ({
				id: sale.id,
				orderId: sale.orderId?.toUpperCase(),
				due: Number(sale.amountDue || 0),
				customerId: sale.customerId,
				salesRepId: sale.salesRepId,
				accountNo: sale.customer?.phoneNo
					? sale.customer.phoneNo
					: sale.customerId
						? `cust-${sale.customerId}`
						: null,
				customerPhone:
					sale.billingAddress?.phoneNo ||
					sale.customer?.phoneNo ||
					sale.shippingAddress?.phoneNo ||
					null,
				email: sale.customer?.email || sale.billingAddress?.email || null,
				displayName:
					sale.customer?.businessName ||
					sale.customer?.name ||
					sale.billingAddress?.name ||
					sale.shippingAddress?.name ||
					null,
				address:
					sale.shippingAddress?.address1 ||
					sale.billingAddress?.address1 ||
					null,
			}))
			.filter((sale) => sale.due > 0),
		customerName:
			sales[0]?.customer?.businessName ||
			sales[0]?.customer?.name ||
			sales[0]?.billingAddress?.name ||
			sales[0]?.shippingAddress?.name ||
			null,
	};
}

export const initializeQuoteAcceptanceSchema = z.object({
	orderId: z.string(),
	token: z.string(),
	acceptedOrderId: z.string().optional().nullable(),
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
		select: quoteAcceptanceSaleSelect,
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
	const acceptedOrderId =
		typeof query.acceptedOrderId === "string" && query.acceptedOrderId
			? query.acceptedOrderId
			: typeof acceptanceMeta.acceptedOrderId === "string"
				? acceptanceMeta.acceptedOrderId
				: canViewAcceptedOrder
					? sale.orderId
					: null;

	if (sale.type !== "quote" && !canViewAcceptedOrder) {
		throw new Error("This quote is no longer available for acceptance.");
	}

	const acceptedOrder =
		canViewAcceptedOrder && sale.type === "order"
			? sale
			: await getAcceptedQuoteOrder(ctx.db, acceptedOrderId, payload.orderId);
	const paymentToken = acceptedOrder
		? await buildFullPaymentToken(ctx, {
				salesId: acceptedOrder.id,
				customerId: acceptedOrder.customerId,
				customerPhone: acceptedOrder.customer?.phoneNo,
				amountDue: acceptedOrder.amountDue,
			})
		: null;
	const currentOrder = acceptedOrder || sale;
	const currentSalesRep = getQuoteAcceptanceSalesRep(currentOrder);

	return {
		payload,
		sale: {
			id: currentOrder.id,
			orderId: currentOrder.orderId,
			originalQuoteOrderId,
			type: acceptedOrder ? "order" : sale.type,
			status: currentOrder.status,
			total: Number(sale.grandTotal || 0),
			due: Number(currentOrder.amountDue || 0),
			customerName: getQuoteAcceptanceCustomerName(currentOrder),
			customerEmail:
				currentOrder.customer?.email ||
				currentOrder.billingAddress?.email ||
				null,
			salesRep: currentSalesRep.name,
			salesRepEmail: currentSalesRep.email,
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
			select: quoteAcceptanceSaleSelect,
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
		const acceptedAt =
			typeof acceptanceMeta.acceptedAt === "string"
				? acceptanceMeta.acceptedAt
				: new Date().toISOString();
		const acceptedOrderId =
			typeof acceptanceMeta.acceptedOrderId === "string"
				? acceptanceMeta.acceptedOrderId
				: null;

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
					customerName: getQuoteAcceptanceCustomerName(sale),
					salesRep: getQuoteAcceptanceSalesRep(sale).name,
					due: Number(sale.amountDue || 0),
					status: sale.status || "Active",
					acceptedAt,
					paymentToken,
				},
				notify: null,
				sendCustomerEmail: false,
				emailAuthorId: null,
				paymentContext: null,
			};
		}

		if (sale.type !== "quote" || sale.orderId !== payload.orderId) {
			throw new Error("This quote is no longer available for acceptance.");
		}

		const existingAcceptedOrder = await getAcceptedQuoteOrder(
			tx,
			acceptedOrderId,
			payload.orderId,
		);
		if (existingAcceptedOrder) {
			const paymentToken = await buildFullPaymentToken(ctx, {
				salesId: existingAcceptedOrder.id,
				customerId: existingAcceptedOrder.customerId,
				customerPhone: existingAcceptedOrder.customer?.phoneNo,
				amountDue: existingAcceptedOrder.amountDue,
			});

			return {
				ok: true,
				alreadyAccepted: true,
				order: {
					salesId: existingAcceptedOrder.id,
					orderId: existingAcceptedOrder.orderId,
					originalQuoteOrderId,
					customerName: getQuoteAcceptanceCustomerName(existingAcceptedOrder),
					salesRep: getQuoteAcceptanceSalesRep(existingAcceptedOrder).name,
					due: Number(existingAcceptedOrder.amountDue || 0),
					status: existingAcceptedOrder.status || "Active",
					acceptedAt,
					paymentToken,
				},
				notify: null,
				sendCustomerEmail: false,
				emailAuthorId: null,
				paymentContext: null,
			};
		}

		const copied = await copySales({
			db: tx as unknown as TRPCContext["db"],
			salesUid: sale.orderId,
			as: "order",
			type: "quote",
			author: {
				id: sale.salesRep?.id || sale.salesRepId || sale.customerId || 1,
				name: sale.salesRep?.name || "Sales Rep",
			},
		});

		if (copied.error || !copied.id || !copied.slug) {
			throw new Error(
				copied.error || "Unable to create an order from this quote.",
			);
		}

		const updatedQuote = await tx.salesOrders.update({
			where: {
				id: sale.id,
			},
			data: {
				meta: {
					...meta,
					quoteAcceptance: {
						...acceptanceMeta,
						acceptedAt,
						originalQuoteOrderId: payload.orderId,
						acceptedOrderId: copied.slug,
						acceptedFrom: "public-link",
					},
				} as Prisma.InputJsonValue,
			},
			select: quoteAcceptanceSaleSelect,
		});

		const copiedOrder = await tx.salesOrders.update({
			where: {
				id: copied.id,
			},
			data: {
				status: "Active",
				meta: {
					...((updatedQuote.meta || {}) as Record<string, unknown>),
					quoteAcceptance: {
						...acceptanceMeta,
						acceptedAt,
						originalQuoteOrderId: payload.orderId,
						acceptedOrderId: copied.slug,
						acceptedFrom: "public-link",
					},
				} as Prisma.InputJsonValue,
			},
			select: quoteAcceptanceOrderSelect,
		});

		return {
			ok: true,
			alreadyAccepted: false,
			order: {
				salesId: copiedOrder.id,
				orderId: copiedOrder.orderId,
				originalQuoteOrderId: payload.orderId,
				customerName: getQuoteAcceptanceCustomerName(copiedOrder),
				salesRep: getQuoteAcceptanceSalesRep(copiedOrder).name,
				due: Number(copiedOrder.amountDue || 0),
				status: copiedOrder.status || "Active",
				acceptedAt,
				paymentToken: null,
			},
			notify: {
				recipients: copiedOrder.salesRep?.id ? [copiedOrder.salesRep.id] : [],
				author: sale.customerId
					? ({
							id: sale.customerId,
							role: "customer",
						} as const)
					: ({
							id: sale.salesRepId || copiedOrder.salesRep?.id || 1,
							role: "employee",
						} as const),
				payload: {
					salesId: copiedOrder.id,
					orderNo: copiedOrder.orderId,
					quoteNo: payload.orderId,
					customerName: getQuoteAcceptanceCustomerName(copiedOrder),
					acceptedAt,
				},
			},
			sendCustomerEmail: true,
			emailAuthorId: copiedOrder.salesRep?.id || sale.salesRepId || null,
			paymentContext: {
				customerId: copiedOrder.customerId,
				customerPhone: copiedOrder.customer?.phoneNo,
				amountDue: copiedOrder.amountDue,
			},
		};
	});
	const response = {
		...result,
		order: {
			...result.order,
			paymentToken:
				result.order.paymentToken ||
				(await buildFullPaymentToken(ctx, {
					salesId: result.order.salesId,
					customerId: result.paymentContext?.customerId,
					customerPhone: result.paymentContext?.customerPhone,
					amountDue: result.paymentContext?.amountDue,
				})),
		},
	};
	if (!response.alreadyAccepted && response.notify) {
		const notificationService = new NotificationService(tasks, ctx);
		if (response.notify.recipients.length) {
			notificationService.setEmployeeRecipients(...response.notify.recipients);
		}
		await notificationService.send("quote_accepted", {
			author: response.notify.author,
			payload: response.notify.payload,
		});
	}
	if (
		!response.alreadyAccepted &&
		response.sendCustomerEmail &&
		result.emailAuthorId
	) {
		const notificationService = new NotificationService(tasks, ctx);
		await notificationService.send("simple_sales_document_email", {
			author: {
				id: result.emailAuthorId,
				role: "employee",
			},
			payload: {
				printType: "order",
				salesIds: [response.order.salesId],
			},
		});
	}
	const {
		notify: _notify,
		sendCustomerEmail: _sendCustomerEmail,
		emailAuthorId: _emailAuthorId,
		paymentContext: _paymentContext,
		...cleanResponse
	} = response;
	return cleanResponse;
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
		const derivedAmount =
			payload.payPlan === "flexible"
				? Number(data.amount || 0)
				: resolveReminderAmount({
						due: totalDue,
						payPlan: payload.payPlan ?? "full",
						preferredAmount: payload.preferredAmount,
						percentage: payload.percentage,
					});
		const amount = Number(derivedAmount || 0);
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
		const phoneNo = normalizeBuyerPhoneNumber(phone);
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
					...(phoneNo ? { buyerPhoneNumber: phoneNo } : {}),
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
	invoiceDownloadUrl?: string | null;
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
						createdBy: {
							select: {
								id: true,
							},
						},
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
				const settledOrders = squarePayment.orders
					.map((entry) => entry.order)
					.filter(
						(
							order,
						): order is NonNullable<
							(typeof squarePayment.orders)[number]["order"]
						> => Boolean(order),
					);
				if (squarePayment?.customerTxs?.length)
					return {
						status: "COMPLETED" as const,
						amount: Number(squarePayment.amount || 0),
						customerReceiptSales: settledOrders.map((order) => ({
							salesId: order.id,
							remainingDue: Number(order.amountDue || 0),
						})),
						customerAuthorId:
							squarePayment.createdBy?.id || settledOrders[0]?.salesRepId || 1,
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
					return paymentSuccess(
						{
							walletId: query.walletId,
							checkoutId: checkout.id,
							squarePaymentId: squarePayment.id,
							orders: settledOrders.map((order) => ({
								...order,
							})),
							tip: resp.tip,
							amount: resp.amount,
							authorId:
								squarePayment.createdBy?.id ||
								settledOrders[0]?.salesRepId ||
								1,
						},
						tx,
					);
				return {
					...resp,
					notifications: Object.values(salesRepsNotifications || {}),
					customerFailureSales: settledOrders.map((order) => ({
						salesId: order.id,
						remainingDue: Number(order.amountDue || 0),
					})),
					customerFailureNotifiedAt:
						(squarePayment.meta as Record<string, unknown> | null)
							?.customerFailureNotifiedAt || null,
					customerFailureMeta:
						(squarePayment.meta as Record<string, unknown> | null) || {},
					customerAuthorId:
						squarePayment.createdBy?.id || settledOrders[0]?.salesRepId || 1,
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
	let invoiceDownloadUrl: string | null = null;
	if (result.status === "COMPLETED") {
		await sendPaymentSystemNotifications(
			tasks,
			ctx,
			notifications as PaymentSystemNotificationEvent[],
		);
		if (
			"customerReceiptSales" in result &&
			result.customerReceiptSales?.length
		) {
			const payload = await buildSalesCustomerPaymentReceivedPayload(ctx.db, {
				sales: result.customerReceiptSales,
				paymentMethod: "online",
				totalAmount: Number(result.amount || 0),
			});
			await new NotificationService(tasks, ctx).send(
				"sales_customer_payment_received",
				{
					author: {
						id: result.customerAuthorId || 1,
						role: "employee",
					},
					payload,
				},
			);
			invoiceDownloadUrl = payload.invoiceDownloadUrl || null;
		}
	}
	if (
		(result.status === "FAILED" || result.status === "CANCELED") &&
		"customerFailureSales" in result &&
		result.customerFailureSales?.length &&
		!result.customerFailureNotifiedAt
	) {
		await new NotificationService(tasks, ctx).send(
			"sales_customer_payment_failed",
			{
				author: {
					id: result.customerAuthorId || 1,
					role: "employee",
				},
				payload: await buildSalesCustomerPaymentFailedPayload(ctx.db, {
					sales: result.customerFailureSales,
					paymentMethod: "online",
					totalAmount: Number(result.amount || 0),
					reason:
						result.status === "CANCELED"
							? "The payment was canceled before completion."
							: "The payment processor could not complete this payment.",
				}),
			},
		);
		await ctx.db.squarePayments.update({
			where: {
				id: query.paymentId,
			},
			data: {
				meta: {
					...("customerFailureMeta" in result
						? result.customerFailureMeta || {}
						: {}),
					customerFailureNotifiedAt: new Date().toISOString(),
				},
			},
		});
	}
	return {
		...result,
		invoiceDownloadUrl,
	};
}
export async function paymentSuccess(
	p: {
		squarePaymentId;
		walletId;
		amount;
		tip;
		orders: { id; customerId; amountDue; salesRepId }[];
		authorId?;
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
	let balance = Number(p.amount || 0);
	return {
		amount: Number(p.amount || 0),
		tip: p.tip,
		status: "COMPLETED" as const,
		notifications: Object.values(salesRepsNotifications || {}),
		customerReceiptSales: p.orders
			.map((order) => {
				const amountApplied =
					balance > Number(order.amountDue || 0)
						? Number(order.amountDue || 0)
						: balance;
				balance -= amountApplied;
				return {
					salesId: order.id,
					amountApplied,
					remainingDue: Math.max(
						Number(order.amountDue || 0) - amountApplied,
						0,
					),
				};
			})
			.filter((sale) => sale.amountApplied > 0),
		customerAuthorId: p.authorId || p.orders[0]?.salesRepId || 1,
	};
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
