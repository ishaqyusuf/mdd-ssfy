import type { TRPCContext } from "@api/trpc/init";
import { expireCurrentSalesDocumentSnapshots } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@api/utils/sales-document-warm";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { NotificationService } from "@gnd/notifications/services/triggers";
import { buildSalesCustomerPaymentReceivedPayload } from "@gnd/notifications/types/sales-customer-payment-utils";
import { recordLegacySalesPayment } from "@gnd/sales/payment-system";
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

async function applySalesPayment(
	ctx: TRPCContext & { userId: number },
	props: SalesPaymentProcessorApplyPaymentInput,
) {
	if (!props.accountNo) throw new Error("Customer account number is required.");
	const wallet = await getCustomerWallet(ctx.db, props.accountNo);
	if (!wallet) throw new Error("Customer not found.");
	const pendingSalesData = await getCustomerPendingSales(ctx, props.accountNo);

	return ctx.db.$transaction(async (tx) => {
		let balance = +props.amount;
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
				authorId: ctx.userId,
				walletId: wallet.id,
				paymentMethod: props.paymentMethod,
				salesId: order.id,
				transactionType: "transaction" as CustomerTransactionType,
				checkNo: props.checkNo,
				squarePaymentId: props.terminalPaymentSession?.squarePaymentId,
				transactionStatus: "success" as CustomerTransanctionStatus,
				paymentStatus: "success" as SalesPaymentStatus,
			});
			const salesPayment = paymentWrite.salesPayment as
				| (typeof paymentWrite.salesPayment & {
						order: {
							id: number;
							salesRep: { id: number };
						};
				  })
				| null;
			if (!salesPayment) continue;

			await updateSalesDueAmount(orderId, tx);
			await createPayrollAction(
				{
					orderId: salesPayment.order.id,
					userId: salesPayment.order.salesRep.id,
					salesPaymentId: salesPayment.id,
					salesAmount: salesPayment.amount,
				},
				tx,
			);

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
	const checkout = await createSquareTerminalCheckout({
		deviceId: props.deviceId,
		allowTipping: props.enableTip || undefined,
		amount: props.amount,
		orderIds: props?.orderNos || undefined,
	});
	if (!checkout?.id) throw new Error("Square checkout did not return an id.");
	consoleLog("CHECKING OUT>>>", checkout);

	const squarePayment = await ctx.db.squarePayments.create({
		data: {
			paymentId: checkout.id,
			squareOrderId: checkout.squareOrderId,
			amount: props.amount,
			paymentMethod: "terminal" as SalesPaymentMethods,
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
