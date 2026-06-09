import type { TRPCContext } from "@api/trpc/init";
import { expireCurrentSalesDocumentSnapshots } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@api/utils/sales-document-warm";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { NotificationService } from "@gnd/notifications/services/triggers";
import { buildSalesCustomerPaymentReceivedPayload } from "@gnd/notifications/types/sales-customer-payment-utils";
import {
	buildPaymentChannelChargeMeta,
	calculatePaymentChannelCharge,
	recordLegacySalesPayment,
} from "@gnd/sales/payment-system";
import {
	salesPaymentProcessorApplyPaymentSchema,
	salesPaymentProcessorCancelTerminalPaymentSchema,
	salesPaymentProcessorSendPaymentLinkSchema,
	salesPaymentProcessorTerminalStatusSchema,
} from "@gnd/sales/payment-system/contracts";
import type {
	PaymentSystemNotificationEvent,
	SalesPaymentProcessorApplyPaymentInput,
} from "@gnd/sales/payment-system/contracts";
import { getCustomerWallet } from "@gnd/sales/wallet";
import {
	cancelSquareTerminalPayment,
	createSquareTerminalCheckout,
	getTerminalPaymentStatus,
} from "@gnd/square";
import { consoleLog } from "@gnd/utils";
import { tokenize } from "@gnd/utils/tokenizer";
import type {
	CustomerTransanctionStatus,
	SalesPaymentMethods,
	SalesPaymentStatus,
} from "@sales/constants";
import type { CustomerTransactionType } from "@sales/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { addDays } from "date-fns";
import type { z } from "zod";
import { getCustomerPendingSales } from "./customer";
import { createPayrollAction, updateSalesDueAmount } from "./sales";
import { getAuthUser } from "./user";

export {
	salesPaymentProcessorApplyPaymentSchema,
	salesPaymentProcessorCancelTerminalPaymentSchema,
	salesPaymentProcessorSendPaymentLinkSchema,
	salesPaymentProcessorTerminalStatusSchema,
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function finiteNumber(value: unknown): number | null {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function resolveSalesCccPercentage(
	sales: Array<{ meta?: unknown }>,
	fallback = 3.5,
) {
	for (const sale of sales) {
		const meta = asRecord(sale.meta);
		const newSalesForm = asRecord(meta?.newSalesForm);
		const settings = asRecord(newSalesForm?.settings);
		const summary = asRecord(newSalesForm?.summary);
		const value =
			finiteNumber(meta?.ccc_percentage) ??
			finiteNumber(meta?.cccPercentage) ??
			finiteNumber(settings?.cccPercentage) ??
			finiteNumber(summary?.cccPercentage);
		if (value != null) return value;
	}
	return fallback;
}

export async function applySalesPaymentProcessorPayment(
	ctx: TRPCContext & { userId: number },
	input: SalesPaymentProcessorApplyPaymentInput,
) {
	const response = {
		terminalPaymentSession: null as typeof input.terminalPaymentSession,
		status: null as "success" | null,
		appliedSalesIds: [] as number[],
	};

	if (
		input.paymentMethod === "terminal" &&
		!input.terminalPaymentSession?.squarePaymentId
	) {
		const data = await createTerminalPayment(ctx, input);
		if (!data?.squareCheckout?.id || !data?.squarePaymentId) {
			throw new Error("Unable to create Square terminal checkout.");
		}
		response.terminalPaymentSession = {
			squarePaymentId: data.squarePaymentId,
			squareCheckoutId: data.squareCheckout.id,
			status: data.status,
		};
		return response;
	}

	const result = await applySalesPayment(ctx, input);
	response.appliedSalesIds = result.appliedSalesIds;
	await sendPaymentSystemNotifications(
		tasks,
		ctx,
		result.events as unknown as PaymentSystemNotificationEvent[],
	);

	if (input.notifyCustomer !== false && result.appliedSales.length) {
		await new NotificationService(tasks, ctx).send(
			"sales_customer_payment_received",
			{
				author: {
					id: ctx.userId,
					role: "employee",
				},
				payload: await buildSalesCustomerPaymentReceivedPayload(ctx.db, {
					sales: result.appliedSales,
					paymentMethod: input.paymentMethod,
					totalAmount: result.totalApplied,
				}),
			},
		);
	}

	response.status = "success";
	await Promise.all(
		response.appliedSalesIds.map(async (salesId) => {
			await expireCurrentSalesDocumentSnapshots({
				db: ctx.db,
				salesOrderId: salesId,
				reason: "payment_recorded",
				documentPrefixes: ["invoice_pdf", "order_packing_pdf"],
			});
			await queueSalesDocumentSnapshotWarmups([
				{ salesOrderId: salesId, mode: "invoice" },
				{ salesOrderId: salesId, mode: "order-packing" },
			]);
		}),
	);

	return response;
}

type SalesPaymentPayrollCandidate = {
	id: number;
	amount: number | string | null;
	order: {
		id: number;
		salesRep?: { id: number | null } | null;
	} | null;
};

export async function createSalesPaymentPayrollIfAvailable(
	tx: Parameters<typeof createPayrollAction>[1],
	salesPayment: SalesPaymentPayrollCandidate,
) {
	const salesRepId = salesPayment.order?.salesRep?.id;
	if (!salesPayment.order?.id || salesRepId == null) {
		return false;
	}

	await createPayrollAction(
		{
			orderId: salesPayment.order.id,
			userId: salesRepId,
			salesPaymentId: salesPayment.id,
			salesAmount: Number(salesPayment.amount || 0),
		},
		tx,
	);

	return true;
}

async function applySalesPayment(
	ctx: TRPCContext & { userId: number },
	props: SalesPaymentProcessorApplyPaymentInput,
) {
	if (!props.accountNo) throw new Error("Customer account number is required.");
	const wallet = await getCustomerWallet(ctx.db, props.accountNo);
	if (!wallet) throw new Error("Customer not found.");
	const pendingSalesData = await getCustomerPendingSales(ctx, props.accountNo);
	const selectedOrders = (props.salesIds || [])
		.map((orderId) => pendingSalesData.find((item) => item.id === orderId))
		.filter(
			(
				order,
			): order is NonNullable<(typeof pendingSalesData)[number]> =>
				Boolean(order),
		);
	const selectedBalance = selectedOrders.reduce(
		(total, order) => total + Number(order?.amountDue || 0),
		0,
	);
	const paymentPrincipalAmount = Math.min(
		Number(props.amount || 0),
		selectedBalance,
	);
	const paymentCharge = calculatePaymentChannelCharge({
		paymentMethod: props.paymentMethod,
		paymentAmount: paymentPrincipalAmount,
		cccPercentage: resolveSalesCccPercentage(selectedOrders),
	});
	const paymentChargeMeta = {
		...buildPaymentChannelChargeMeta(paymentCharge),
		cccPercentage: paymentCharge.percentage,
	};

	return ctx.db.$transaction(async (tx) => {
		let balance = paymentPrincipalAmount;
		let customerTransactionId: number | null = null;
		const appliedSalesIds: number[] = [];
		const appliedSales: {
			salesId: number;
			amountApplied: number;
			remainingDue: number;
		}[] = [];
		const events: Awaited<
			ReturnType<typeof recordLegacySalesPayment>
		>["events"] = [];

		for (const orderId of props.salesIds || []) {
			const order = pendingSalesData.find((item) => item.id === orderId);
			if (!order) throw new Error("Order not found.");
			if (balance <= 0) break;

			const amountDue = Number(order.amountDue || 0);
			const payAmount = balance > amountDue ? amountDue : balance;
			if (payAmount <= 0) continue;

			balance -= payAmount;
			const paymentWrite = await recordLegacySalesPayment(tx, {
				amount: payAmount,
				transactionAmount:
					customerTransactionId == null
						? paymentCharge.chargeAmount
						: undefined,
				authorId: ctx.userId,
				walletId: wallet.id,
				paymentMethod: props.paymentMethod,
				salesId: order.id,
				customerTransactionId,
				transactionType: "transaction" as CustomerTransactionType,
				checkNo: props.checkNo,
				squarePaymentId: props.terminalPaymentSession?.squarePaymentId,
				transactionStatus: "success" as CustomerTransanctionStatus,
				paymentStatus: "success" as SalesPaymentStatus,
				transactionMeta:
					customerTransactionId == null ? paymentChargeMeta : undefined,
			});
			customerTransactionId = paymentWrite.customerTransactionId;
			const salesPayment = paymentWrite.salesPayment as
				| (typeof paymentWrite.salesPayment & {
						order: {
							id: number;
							salesRep: { id: number } | null;
						};
				  })
				| null;
			if (!salesPayment) continue;

			await updateSalesDueAmount(orderId, tx);
			await createSalesPaymentPayrollIfAvailable(tx, salesPayment);

			appliedSalesIds.push(order.id);
			appliedSales.push({
				salesId: order.id,
				amountApplied: payAmount,
				remainingDue: Math.max(Number(order.amountDue || 0) - payAmount, 0),
			});
			events.push(...paymentWrite.events);
		}

		return {
			appliedSalesIds,
			appliedSales,
			totalApplied: appliedSales.reduce(
				(sum, sale) => sum + Number(sale.amountApplied || 0),
				0,
			),
			events,
		};
	});
}

async function createTerminalPayment(
	ctx: TRPCContext & { userId: number },
	props: SalesPaymentProcessorApplyPaymentInput,
) {
	if (!props.deviceId) throw new Error("Square terminal device is required.");
	const pendingSalesData = props.accountNo
		? await getCustomerPendingSales(ctx, props.accountNo)
		: [];
	const selectedOrders = (props.salesIds || [])
		.map((orderId) => pendingSalesData.find((item) => item.id === orderId))
		.filter(
			(
				order,
			): order is NonNullable<(typeof pendingSalesData)[number]> =>
				Boolean(order),
		);
	const selectedBalance = selectedOrders.reduce(
		(total, order) => total + Number(order.amountDue || 0),
		0,
	);
	const paymentPrincipalAmount =
		selectedBalance > 0
			? Math.min(Number(props.amount || 0), selectedBalance)
			: Number(props.amount || 0);
	const paymentCharge = calculatePaymentChannelCharge({
		paymentMethod: "terminal" as SalesPaymentMethods,
		paymentAmount: paymentPrincipalAmount,
		cccPercentage: resolveSalesCccPercentage(selectedOrders),
	});
	const paymentChargeMeta = {
		...buildPaymentChannelChargeMeta(paymentCharge),
		cccPercentage: paymentCharge.percentage,
	};
	const checkout = await createSquareTerminalCheckout({
		deviceId: props.deviceId,
		allowTipping: props.enableTip || undefined,
		amount: paymentCharge.chargeAmount,
		orderIds: props?.orderNos || undefined,
	});
	if (!checkout?.id) throw new Error("Square checkout did not return an id.");
	consoleLog("CHECKING OUT>>>", checkout);

	const squarePayment = await ctx.db.squarePayments.create({
		data: {
			paymentId: checkout.id,
			squareOrderId: checkout.squareOrderId,
			amount: paymentCharge.chargeAmount,
			paymentMethod: "terminal" as SalesPaymentMethods,
			meta: paymentChargeMeta,
			createdBy: {
				connect: {
					id: ctx.userId,
				},
			},
			status: "PENDING",
			paymentTerminal: props.deviceId
				? {
						connectOrCreate: {
							where: {
								terminalId: props.deviceId,
							},
							create: {
								terminalId: props.deviceId,
								terminalName: props.deviceName,
							},
						},
					}
				: undefined,
		},
	});
	return {
		squarePaymentId: squarePayment.id,
		squareCheckout: checkout,
		status: squarePayment.status,
		tip: null,
	};
}

export async function cancelSalesPaymentProcessorTerminalPayment(
	ctx: TRPCContext,
	input: z.infer<typeof salesPaymentProcessorCancelTerminalPaymentSchema>,
) {
	if (input.checkoutId) {
		const { status } = await getTerminalPaymentStatus(input.checkoutId);
		if (status === "COMPLETED") throw new Error("Payment already received!");
		await cancelSquareTerminalPayment(input.checkoutId);
	}
	if (input.squarePaymentId) {
		await ctx.db.squarePayments.update({
			where: {
				id: input.squarePaymentId,
				status: {
					not: "COMPLETED",
				},
			},
			data: {
				status: "CANCELED",
			},
		});
	}
	return { ok: true };
}

export async function getSalesPaymentProcessorTerminalStatus(
	input: z.infer<typeof salesPaymentProcessorTerminalStatusSchema>,
) {
	const { status, tip } = await getTerminalPaymentStatus(input.checkoutId);
	return { status, tip };
}

export async function sendSalesPaymentProcessorPaymentLink(
	ctx: TRPCContext & { userId: number },
	input: z.infer<typeof salesPaymentProcessorSendPaymentLinkSchema>,
) {
	const auth = await getAuthUser(ctx);
	const expiry = addDays(new Date(), 7).toISOString();
	const downloadToken = tokenize({
		salesIds: input.ids,
		expiry,
		mode: input.mode,
	});
	const paymentToken =
		input.walletId == null
			? null
			: tokenize({
					salesIds: input.ids,
					expiry,
					amount: input.amount,
					walletId: input.walletId,
				});

	await tasks.trigger("send-sales-reminder", {
		salesRepId: auth.id,
		salesRepEmail: auth.email,
		salesRep: auth.name || auth.email,
		sales: [
			{
				type: input.type,
				salesIds: input.ids,
				customerEmail: input.customer.email,
				customerName: input.customer.name,
				downloadToken,
				paymentToken,
			},
		],
	});

	return { ok: true };
}
