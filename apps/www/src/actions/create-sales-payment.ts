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
import { createSquareTerminalCheckout } from "@gnd/square";
import { consoleLog } from "@gnd/utils";
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
		const touchedSalesIds = [...input.salesIds];
		const response = {
			terminalPaymentSession: null as typeof input.terminalPaymentSession,
			status: null,
		};
		if (input.paymentMethod === "terminal") {
			if (input.terminalPaymentSession?.squarePaymentId) {
				await applySalesPayment(input);
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
			await applySalesPayment(input);
			response.status = "success";
		}
		if (response.status === "success") {
			await Promise.all(
				touchedSalesIds.map(async (salesId) => {
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

async function applySalesPayment(props: z.infer<typeof createPaymentSchema>) {
	return prisma.$transaction(async (tx) => {
		const wallet = await getCustomerWallet(tx, props.accountNo);
		if (!wallet) throw new Error("Customer not found.");
		const pendingSalesData = await getCustomerPendingSales(props.accountNo);
		let balance = +props.amount;
		await Promise.all(
			props.salesIds.map(async (orderId) => {
				const order = pendingSalesData.find((o) => o.id === orderId);
				if (!order) throw new Error("Order not found.");
				const payAmount = balance > order.amountDue ? order.amountDue : balance;
				balance -= payAmount;
				const __tx = await tx.customerTransaction.create({
					data: {
						amount: payAmount,
						wallet: {
							connect: {
								id: wallet.id,
							},
						},
						paymentMethod: props.paymentMethod,
						status: "success" as CustomerTransactionStatus,
						meta: {
							checkNo: props.checkNo,
						},
						type: "transaction" as CustomerTransactionType,
						author: {
							connect: {
								id: await authId(),
							},
						},
						squarePayment: props.terminalPaymentSession?.squarePaymentId
							? {
									connect: {
										id: props.terminalPaymentSession?.squarePaymentId,
									},
								}
							: undefined,
						salesPayments: {
							create: {
								meta: {
									checkNo: props.checkNo,
								},
								amount: payAmount,
								status: "success" as SalesPaymentStatus,
								orderId: order.id,
								squarePaymentsId: props.terminalPaymentSession?.squarePaymentId,
							},
						},
					},
					select: {
						salesPayments: {
							select: {
								id: true,
								amount: true,
								order: {
									select: {
										salesRepId: true,
										id: true,
										orderId: true,
									},
								},
							},
						},
					},
				});
				const [sp] = __tx.salesPayments;
				await updateSalesDueAmount(orderId, tx);
				await createPayrollAction({
					orderId: sp.order.id,
					userId: sp.order.salesRepId,
					salesPaymentId: sp.id,
					salesAmount: sp.amount,
				});
			}),
		);
		return {};
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
