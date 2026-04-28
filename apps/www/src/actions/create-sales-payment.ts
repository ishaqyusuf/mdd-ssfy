"use server";

import type { SquarePaymentStatus } from "@/_v2/lib/square";
import type {
	SalesPaymentStatus,
	SquarePaymentMethods,
} from "@/app-deps/(clean-code)/(sales)/types";
import { authId } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { errorHandler } from "@/modules/error/handler";
import { expireCurrentSalesDocumentSnapshots } from "@gnd/api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@gnd/api/utils/sales-document-warm";
import {
	buildSalesCustomerPaymentReceivedPayload,
} from "@gnd/notifications/types/sales-customer-payment-utils";
import { NotificationService } from "@gnd/notifications/services/triggers";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { recordLegacySalesPayment } from "@gnd/sales/payment-system";
import { createSquareTerminalCheckout } from "@gnd/square";
import { consoleLog } from "@gnd/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import type { z } from "zod";

import type { CustomerTransactionStatus } from "@/utils/constants";
import { getCustomerWallet } from "@sales/wallet";
import { createPayrollAction } from "./create-payroll";
import { getCustomerPendingSales } from "./get-customer-pending-sales";
import type { CustomerTransactionType } from "./get-customer-tx-action";
import { actionClient } from "./safe-action";
import { createPaymentSchema } from "./schema";
import { updateSalesDueAmount } from "./update-sales-due-amount";

export const createSalesPaymentAction = actionClient
	.schema(createPaymentSchema)
	.metadata({
		name: "create-sales-payment",
	})
	.action(async ({ parsedInput: { ...input } }) => {
		const authorId = await authId();
		const response = {
			terminalPaymentSession: null as typeof input.terminalPaymentSession,
			status: null,
			appliedSalesIds: [] as number[],
		};
		if (input.paymentMethod === "terminal") {
			if (input.terminalPaymentSession?.squarePaymentId) {
				const result = await applySalesPayment(input, authorId);
				response.appliedSalesIds = result.appliedSalesIds;
				await sendPaymentSystemNotifications(
					tasks,
					{ db: prisma, userId: authorId },
					result.events,
				);
				if (input.notifyCustomer !== false && result.appliedSales.length) {
					const notification = new NotificationService(tasks, {
						db: prisma,
						userId: authorId,
					});
					await notification.send("sales_customer_payment_received", {
						author: {
							id: authorId,
							role: "employee",
						},
						payload: await buildSalesCustomerPaymentReceivedPayload(prisma, {
							sales: result.appliedSales,
							paymentMethod: input.paymentMethod,
							totalAmount: result.totalApplied,
						}),
					});
				}
				response.status = "success";
			} else {
				const { error, resp: data } = await createTerminalPayment(input);

				if (error)
					throw Error(
						error.message || "Unable to create Square terminal checkout.",
					);
				if (!data?.squareCheckout?.id || !data?.squarePaymentId) {
					throw Error("Unable to create Square terminal checkout.");
				}
				response.terminalPaymentSession = {
					squarePaymentId: data.squarePaymentId,
					squareCheckoutId: data.squareCheckout.id,
					status: data.status,
					// tip: data.tip
				};
			}
		} else {
			const result = await applySalesPayment(input, authorId);
			response.appliedSalesIds = result.appliedSalesIds;
			await sendPaymentSystemNotifications(
				tasks,
				{ db: prisma, userId: authorId },
				result.events,
			);
			if (input.notifyCustomer !== false && result.appliedSales.length) {
				const notification = new NotificationService(tasks, {
					db: prisma,
					userId: authorId,
				});
				await notification.send("sales_customer_payment_received", {
					author: {
						id: authorId,
						role: "employee",
					},
					payload: await buildSalesCustomerPaymentReceivedPayload(prisma, {
						sales: result.appliedSales,
						paymentMethod: input.paymentMethod,
						totalAmount: result.totalApplied,
					}),
				});
			}
			response.status = "success";
		}
		if (response.status === "success") {
			await Promise.all(
				response.appliedSalesIds.map(async (salesId) => {
					await expireCurrentSalesDocumentSnapshots({
						db: prisma,
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
		}
		return response;
	});

async function applySalesPayment(
	props: z.infer<typeof createPaymentSchema>,
	authorId: number,
) {
	return prisma.$transaction(async (tx) => {
		const wallet = await getCustomerWallet(tx, props.accountNo);
		if (!wallet) throw new Error("Customer not found.");
		const pendingSalesData = await getCustomerPendingSales(props.accountNo);
		let balance = +props.amount;
		const appliedSalesIds: number[] = [];
		const appliedSales: {
			salesId: number;
			amountApplied: number;
			remainingDue: number;
		}[] = [];
		const events = [];

		for (const orderId of props.salesIds || []) {
			const order = pendingSalesData.find((item) => item.id === orderId);
			if (!order) throw new Error("Order not found.");
			if (balance <= 0) break;

			const payAmount = balance > order.amountDue ? order.amountDue : balance;
			if (payAmount <= 0) continue;

			balance -= payAmount;
			const paymentWrite = await recordLegacySalesPayment(tx, {
				amount: payAmount,
				authorId,
				walletId: wallet.id,
				paymentMethod: props.paymentMethod,
				salesId: order.id,
				transactionType: "transaction" as CustomerTransactionType,
				checkNo: props.checkNo,
				squarePaymentId: props.terminalPaymentSession?.squarePaymentId,
				transactionStatus: "success" as CustomerTransactionStatus,
				paymentStatus: "success" as SalesPaymentStatus,
			});
			const salesPayment = paymentWrite.salesPayment;
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
	props: z.infer<typeof createPaymentSchema>,
) {
	return await errorHandler(async () => {
		const checkout = await createSquareTerminalCheckout({
			deviceId: props.deviceId,
			allowTipping: props.enableTip,
			amount: props.amount,
			orderIds: props?.orderNos,
		});
		if (!checkout?.id) throw new Error("Square checkout did not return an id.");
		consoleLog("CHECKING OUT>>>", checkout);

		const squarePayment = await prisma.squarePayments.create({
			data: {
				paymentId: checkout.id,
				squareOrderId: checkout.squareOrderId,
				amount: props.amount,
				paymentMethod: "terminal" as SquarePaymentMethods,
				createdBy: {
					connect: {
						id: await authId(),
					},
				},
				status: "PENDING" as SquarePaymentStatus,
				paymentTerminal: {
					connectOrCreate: {
						where: {
							terminalId: props.deviceId,
						},
						create: {
							terminalId: props.deviceId,
							terminalName: props.deviceName,
						},
					},
				},
			},
		});
		return {
			squarePaymentId: squarePayment.id,
			squareCheckout: checkout,
			status: squarePayment.status as SquarePaymentStatus,
			tip: null,
		};
	});
}
