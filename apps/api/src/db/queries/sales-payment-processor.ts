import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import type { TRPCContext } from "@api/trpc/init";
import { expireCurrentSalesDocumentSnapshots } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@api/utils/sales-document-warm";
import { assertCanSetSalesPaymentDate } from "@api/utils/sales-payment-date-access";
import { logger } from "@gnd/logger";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { NotificationService } from "@gnd/notifications/services/triggers";
import { buildSalesCustomerPaymentReceivedPayload } from "@gnd/notifications/types/sales-customer-payment-utils";
import {
	buildPaymentChannelChargeMeta,
	calculatePaymentChannelCharge,
	captureVerifiedSquareTender,
	createLegacyWalletCreditTransaction,
	getSalesPaymentBusinessDate,
	recordLegacySalesPayment,
	resolveSalesPaymentOccurrence,
	roundMoney,
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
	getSquareDevices,
	getSquareTenderPayment,
	getTerminalPaymentStatus,
	normalizeTerminalDeviceId,
	verifySquareTerminalReady,
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

export type CustomerReceiptQueueStatus = "not_requested" | "queued" | "failed";

type CustomerReceiptSale = {
	salesId: number;
	orderId: string;
	amountApplied: number;
	remainingDue: number;
};

type CustomerReceiptPayload = Awaited<
	ReturnType<typeof buildSalesCustomerPaymentReceivedPayload>
>;

export async function queueSalesCustomerPaymentReceipt(
	ctx: TRPCContext & { userId: number },
	input: {
		notifyCustomer?: boolean | null;
		sales: CustomerReceiptSale[];
		paymentMethod: string;
		totalAmount: number;
	},
	dependencies?: {
		buildPayload?: typeof buildSalesCustomerPaymentReceivedPayload;
		send?: (payload: CustomerReceiptPayload) => Promise<void>;
	},
): Promise<CustomerReceiptQueueStatus> {
	if (input.notifyCustomer !== true || !input.sales.length) {
		return "not_requested";
	}

	try {
		const payload = await (
			dependencies?.buildPayload ?? buildSalesCustomerPaymentReceivedPayload
		)(ctx.db, {
			sales: input.sales,
			paymentMethod: input.paymentMethod,
			totalAmount: input.totalAmount,
		});

		if (dependencies?.send) {
			await dependencies.send(payload);
		} else {
			await new NotificationService(tasks, ctx).send(
				"sales_customer_payment_received",
				{
					author: {
						id: ctx.userId,
						role: "employee",
					},
					payload,
				},
			);
		}

		return "queued";
	} catch (error) {
		logger.error("Failed to queue customer payment receipt", {
			error,
			salesIds: input.sales.map((sale) => sale.salesId),
		});
		return "failed";
	}
}

export async function applySalesPaymentProcessorPayment(
	ctx: TRPCContext & { userId: number },
	input: SalesPaymentProcessorApplyPaymentInput,
) {
	await assertCanSetSalesPaymentDate(ctx, input.paymentDate);

	const response = {
		terminalPaymentSession: null as typeof input.terminalPaymentSession,
		status: null as "success" | null,
		appliedSalesIds: [] as number[],
		appliedSales: [] as {
			salesId: number;
			orderId: string;
			amountApplied: number;
			remainingDue: number;
		}[],
		walletAppliedAmount: 0,
		walletCreditAmount: 0,
		customerChargeAmount: 0,
		customerReceiptQueueStatus: "not_requested" as CustomerReceiptQueueStatus,
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

	const terminalSettlement =
		await verifySalesPaymentProcessorTerminalSettlement(ctx, input);
	const result = await applySalesPayment(ctx, input, terminalSettlement);
	response.appliedSalesIds = result.appliedSalesIds;
	response.appliedSales = result.appliedSales;
	response.walletAppliedAmount = result.walletAppliedAmount;
	response.walletCreditAmount = result.walletCreditAmount;
	response.customerChargeAmount = result.paymentCharge.chargeAmount;
	await sendPaymentSystemNotifications(
		tasks,
		ctx,
		result.events as unknown as PaymentSystemNotificationEvent[],
	);

	response.customerReceiptQueueStatus = await queueSalesCustomerPaymentReceipt(
		ctx,
		{
			notifyCustomer: input.notifyCustomer,
			sales: result.appliedSales,
			paymentMethod: input.paymentMethod,
			totalAmount: result.totalApplied,
		},
	);

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
	await reconcileSalesHandoffAfterCommit(ctx.db, {
		salesOrderIds: response.appliedSalesIds,
		actorUserId: ctx.userId,
		source: "api.sales-payment-processor.apply-payment",
		initialExposureMilestone: "QUALIFICATION",
	});

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
	terminalSettlement: VerifiedTerminalSettlement | null = null,
) {
	if (!props.accountNo) throw new Error("Customer account number is required.");
	const recordedAt = new Date();
	const occurrence = terminalSettlement
		? {
				occurredAt: terminalSettlement.paidAt || recordedAt,
				paymentDate: getSalesPaymentBusinessDate(
					terminalSettlement.paidAt || recordedAt,
				),
				recordedAt,
				source: "square_provider",
			}
		: resolveSalesPaymentOccurrence({
				now: recordedAt,
				paymentDate: props.paymentDate,
			});
	const paymentDateMeta = {
		paymentDate: occurrence.paymentDate,
		paymentDateSource: occurrence.source,
		recordedAt: occurrence.recordedAt.toISOString(),
	};
	const wallet = await getCustomerWallet(ctx.db, props.accountNo);
	if (!wallet) throw new Error("Customer not found.");
	const pendingSalesData = await getCustomerPendingSales(ctx, props.accountNo);
	const selectedOrders = (props.salesIds || [])
		.map((orderId) => pendingSalesData.find((item) => item.id === orderId))
		.filter((order): order is NonNullable<(typeof pendingSalesData)[number]> =>
			Boolean(order),
		);
	const selectedBalance = selectedOrders.reduce(
		(total, order) => total + Number(order?.amountDue || 0),
		0,
	);
	const requestedExternalAmount = roundMoney(Number(props.amount || 0));
	const walletAppliedAmount =
		props.useWallet || props.paymentMethod === "wallet"
			? roundMoney(Math.min(Number(wallet.balance || 0), selectedBalance))
			: 0;
	const externalAmount =
		props.paymentMethod === "wallet" ? 0 : Math.max(requestedExternalAmount, 0);
	const remainingAfterWallet = roundMoney(
		Math.max(selectedBalance - walletAppliedAmount, 0),
	);
	const externalPrincipalAmount = roundMoney(
		Math.min(externalAmount, remainingAfterWallet),
	);
	const walletCreditAmount = roundMoney(
		Math.max(externalAmount - externalPrincipalAmount, 0),
	);
	const paymentChargeResult = calculatePaymentChannelCharge({
		paymentMethod: props.paymentMethod,
		paymentAmount: externalPrincipalAmount,
		cccPercentage: resolveSalesCccPercentage(selectedOrders),
	});
	const paymentCharge = {
		...paymentChargeResult,
		chargeAmount: roundMoney(externalAmount + paymentChargeResult.amount),
	};
	const paymentChargeMeta = {
		...buildPaymentChannelChargeMeta(paymentCharge),
		cccPercentage: paymentCharge.percentage,
		externalAppliedAmount: externalPrincipalAmount,
		walletAppliedAmount,
		walletCreditAmount,
	};

	return ctx.db.$transaction(async (tx) => {
		if (terminalSettlement) {
			await claimSalesPaymentProcessorTerminalSettlement(
				tx,
				terminalSettlement,
			);
		}

		let walletBalance = walletAppliedAmount;
		let externalBalance = externalPrincipalAmount;
		let externalCustomerTransactionId: number | null = null;
		const appliedSalesIds: number[] = [];
		const appliedSales: {
			salesId: number;
			orderId: string;
			amountApplied: number;
			remainingDue: number;
		}[] = [];
		const events: Awaited<
			ReturnType<typeof recordLegacySalesPayment>
		>["events"] = [];

		for (const orderId of props.salesIds || []) {
			const order = pendingSalesData.find((item) => item.id === orderId);
			if (!order) throw new Error("Order not found.");

			let amountDue = roundMoney(Number(order.amountDue || 0));
			let orderAppliedAmount = 0;

			if (walletBalance > 0 && amountDue > 0) {
				const walletPayAmount = roundMoney(Math.min(walletBalance, amountDue));
				walletBalance = roundMoney(walletBalance - walletPayAmount);
				amountDue = roundMoney(amountDue - walletPayAmount);
				orderAppliedAmount = roundMoney(orderAppliedAmount + walletPayAmount);

				const paymentWrite = await recordLegacySalesPayment(tx, {
					amount: walletPayAmount,
					authorId: ctx.userId,
					occurredAt: occurrence.occurredAt,
					walletId: wallet.id,
					paymentMethod: "wallet" as SalesPaymentMethods,
					salesId: order.id,
					transactionType: "pay-with-wallet" as CustomerTransactionType,
					transactionStatus: "success" as CustomerTransanctionStatus,
					paymentStatus: "success" as SalesPaymentStatus,
					transactionMeta: {
						...paymentDateMeta,
						source: "wallet-balance-payment",
						destinationSalesId: order.id,
						destinationOrderId: order.orderId,
						walletAppliedAmount: walletPayAmount,
					},
					paymentMeta: paymentDateMeta,
				});
				const salesPayment = paymentWrite.salesPayment as
					| (typeof paymentWrite.salesPayment & {
							order: {
								id: number;
								salesRep: { id: number } | null;
							};
					  })
					| null;
				if (salesPayment) {
					await createSalesPaymentPayrollIfAvailable(tx, salesPayment);
					events.push(...paymentWrite.events);
				}
			}

			if (externalBalance > 0 && amountDue > 0) {
				const externalPayAmount = roundMoney(
					Math.min(externalBalance, amountDue),
				);
				externalBalance = roundMoney(externalBalance - externalPayAmount);
				amountDue = roundMoney(amountDue - externalPayAmount);
				orderAppliedAmount = roundMoney(orderAppliedAmount + externalPayAmount);

				const paymentWrite = await recordLegacySalesPayment(tx, {
					amount: externalPayAmount,
					transactionAmount:
						externalCustomerTransactionId == null
							? paymentCharge.chargeAmount
							: undefined,
					authorId: ctx.userId,
					occurredAt: occurrence.occurredAt,
					walletId: wallet.id,
					paymentMethod: props.paymentMethod,
					salesId: order.id,
					customerTransactionId: externalCustomerTransactionId,
					transactionType: "transaction" as CustomerTransactionType,
					checkNo: props.checkNo,
					squarePaymentId: props.terminalPaymentSession?.squarePaymentId,
					transactionStatus: "success" as CustomerTransanctionStatus,
					paymentStatus: "success" as SalesPaymentStatus,
					transactionMeta:
						externalCustomerTransactionId == null
							? { ...paymentChargeMeta, ...paymentDateMeta }
							: undefined,
					paymentMeta: paymentDateMeta,
				});
				externalCustomerTransactionId = paymentWrite.customerTransactionId;
				const salesPayment = paymentWrite.salesPayment as
					| (typeof paymentWrite.salesPayment & {
							order: {
								id: number;
								salesRep: { id: number } | null;
							};
					  })
					| null;
				if (salesPayment) {
					await createSalesPaymentPayrollIfAvailable(tx, salesPayment);
					events.push(...paymentWrite.events);
				}
			}

			if (orderAppliedAmount <= 0) continue;

			await updateSalesDueAmount(orderId, tx);

			appliedSalesIds.push(order.id);
			appliedSales.push({
				salesId: order.id,
				orderId: order.orderId,
				amountApplied: orderAppliedAmount,
				remainingDue: amountDue,
			});
		}

		if (walletCreditAmount > 0) {
			const selectedOrderIds = selectedOrders.map((order) => order.orderId);
			await createLegacyWalletCreditTransaction(tx, {
				amount: walletCreditAmount,
				authorId: ctx.userId,
				occurredAt: occurrence.occurredAt,
				meta: {
					...paymentChargeMeta,
					...paymentDateMeta,
					source: "sales-overpayment",
					selectedSalesIds: props.salesIds || [],
					selectedOrderIds,
					selectedBalance,
					appliedSales,
				},
				note: "Overpayment credit from sales payment",
				paymentMethod: props.paymentMethod,
				reason: "sales-overpayment",
				squarePaymentId: props.terminalPaymentSession?.squarePaymentId,
				walletId: wallet.id,
			});
		}

		if (terminalSettlement) {
			assertSalesPaymentProcessorTerminalSettlementApplied(appliedSales);
			await completeSalesPaymentProcessorTerminalSettlement(
				tx,
				terminalSettlement,
				appliedSalesIds,
			);
		}

		return {
			appliedSalesIds,
			appliedSales,
			totalApplied: appliedSales.reduce(
				(sum, sale) => sum + Number(sale.amountApplied || 0),
				0,
			),
			walletAppliedAmount,
			walletCreditAmount,
			paymentCharge,
			events,
		};
	});
}

export function assertSalesPaymentProcessorTerminalSettlementApplied(
	appliedSales: { amountApplied: number }[],
) {
	if (
		appliedSales.length === 0 ||
		appliedSales.every((sale) => Number(sale.amountApplied || 0) <= 0)
	) {
		throw new Error(
			"Terminal payment was received, but no selected order could be credited.",
		);
	}
}

type VerifiedTerminalSettlement = {
	squareCheckoutId: string;
	squarePaymentId: string;
	tip: number;
	paidAt: Date | null;
};

export async function claimSalesPaymentProcessorTerminalSettlement(
	tx: Pick<TRPCContext["db"], "squarePayments">,
	settlement: VerifiedTerminalSettlement,
) {
	const claimed = await tx.squarePayments.updateMany({
		where: {
			id: settlement.squarePaymentId,
			paymentId: settlement.squareCheckoutId,
			OR: [
				{ status: "PENDING" },
				{
					status: "COMPLETED",
					salesPayments: { none: {} },
				},
			],
		},
		data: {
			status: "PROCESSING",
			tip: settlement.tip,
		},
	});
	if (claimed.count !== 1) {
		throw new Error(
			"Terminal payment was already applied, canceled, or is no longer available.",
		);
	}
}

export async function completeSalesPaymentProcessorTerminalSettlement(
	tx: Pick<TRPCContext["db"], "squarePaymentOrders" | "squarePayments">,
	settlement: VerifiedTerminalSettlement,
	salesOrderIds: number[] = [],
) {
	const completed = await tx.squarePayments.updateMany({
		where: {
			id: settlement.squarePaymentId,
			paymentId: settlement.squareCheckoutId,
			status: "PROCESSING",
		},
		data: {
			status: "COMPLETED",
			tip: settlement.tip,
		},
	});
	if (completed.count !== 1) {
		throw new Error("Unable to finalize the terminal payment record.");
	}
	if (salesOrderIds.length) {
		await tx.squarePaymentOrders.createMany({
			data: salesOrderIds.map((orderId) => ({
				orderId,
				squarePaymentId: settlement.squarePaymentId,
			})),
		});
	}
}

export async function verifySalesPaymentProcessorTerminalSettlement(
	ctx: TRPCContext,
	input: SalesPaymentProcessorApplyPaymentInput,
	dependencies: {
		getTerminalPaymentStatus: typeof getTerminalPaymentStatus;
	} = { getTerminalPaymentStatus },
): Promise<VerifiedTerminalSettlement | null> {
	if (input.paymentMethod !== "terminal") return null;
	const squareCheckoutId = input.terminalPaymentSession?.squareCheckoutId;
	const squarePaymentId = input.terminalPaymentSession?.squarePaymentId;
	if (!squareCheckoutId || !squarePaymentId) {
		throw new Error("Terminal payment session is incomplete.");
	}

	const terminalStatus =
		await dependencies.getTerminalPaymentStatus(squareCheckoutId);
	const { status, tip } = terminalStatus;
	const paymentIds = terminalStatus.paymentIds || [];
	if (status === "CANCELED") {
		await ctx.db.squarePayments.updateMany({
			where: {
				paymentId: squareCheckoutId,
				status: { not: "COMPLETED" },
			},
			data: { status: "CANCELED" },
		});
		throw new Error("Terminal payment was canceled.");
	}
	if (status !== "COMPLETED") {
		throw new Error("Terminal payment is not complete.");
	}
	let paidAt: Date | null = null;
	for (const providerPaymentId of paymentIds) {
		const payment = await getSquareTenderPayment(providerPaymentId);
		if (payment.paidAt && (!paidAt || payment.paidAt > paidAt)) {
			paidAt = payment.paidAt;
		}
		await captureVerifiedSquareTender(ctx.db, {
			...payment,
			legacySquarePaymentId: squarePaymentId,
			checkoutId: squareCheckoutId,
			source: "terminal",
			verificationSource: "terminal_settlement",
		});
	}

	return {
		squareCheckoutId,
		squarePaymentId,
		tip,
		paidAt,
	};
}

type TerminalPaymentDependencies = {
	createSquareTerminalCheckout: typeof createSquareTerminalCheckout;
	getCustomerPendingSales: typeof getCustomerPendingSales;
	getCustomerWallet: typeof getCustomerWallet;
	getSquareDevices: typeof getSquareDevices;
	verifySquareTerminalReady: typeof verifySquareTerminalReady;
};

const terminalPaymentDependencies: TerminalPaymentDependencies = {
	createSquareTerminalCheckout,
	getCustomerPendingSales,
	getCustomerWallet,
	getSquareDevices,
	verifySquareTerminalReady,
};

export async function createTerminalPayment(
	ctx: TRPCContext & { userId: number },
	props: SalesPaymentProcessorApplyPaymentInput,
	dependencies: TerminalPaymentDependencies = terminalPaymentDependencies,
) {
	if (!props.deviceId) throw new Error("Square terminal device is required.");
	const pendingSalesData = props.accountNo
		? await dependencies.getCustomerPendingSales(ctx, props.accountNo)
		: [];
	const selectedOrders = (props.salesIds || [])
		.map((orderId) => pendingSalesData.find((item) => item.id === orderId))
		.filter((order): order is NonNullable<(typeof pendingSalesData)[number]> =>
			Boolean(order),
		);
	const selectedBalance = selectedOrders.reduce(
		(total, order) => total + Number(order.amountDue || 0),
		0,
	);
	const wallet =
		props.useWallet && props.accountNo
			? await dependencies.getCustomerWallet(ctx.db, props.accountNo)
			: null;
	const walletAppliedAmount = props.useWallet
		? roundMoney(Math.min(Number(wallet?.balance || 0), selectedBalance))
		: 0;
	const remainingAfterWallet = roundMoney(
		Math.max(selectedBalance - walletAppliedAmount, 0),
	);
	const externalAmount = roundMoney(Number(props.amount || 0));
	if (externalAmount <= 0) {
		throw new Error("Terminal payment amount must be greater than zero.");
	}
	const externalPrincipalAmount = roundMoney(
		Math.min(externalAmount, remainingAfterWallet),
	);
	const paymentChargeResult = calculatePaymentChannelCharge({
		paymentMethod: "terminal" as SalesPaymentMethods,
		paymentAmount: externalPrincipalAmount,
		cccPercentage: resolveSalesCccPercentage(selectedOrders),
	});
	const paymentCharge = {
		...paymentChargeResult,
		chargeAmount: roundMoney(externalAmount + paymentChargeResult.amount),
	};
	const paymentChargeMeta = {
		...buildPaymentChannelChargeMeta(paymentCharge),
		cccPercentage: paymentCharge.percentage,
		externalAppliedAmount: externalPrincipalAmount,
		walletAppliedAmount,
		walletCreditAmount: Math.max(externalAmount - remainingAfterWallet, 0),
	};
	const terminalResult = await dependencies.getSquareDevices();
	if (terminalResult.errors?.length) {
		throw new Error(
			terminalResult.errors[0]?.detail ||
				"Unable to verify Square terminals. Refresh the payment form and try again.",
		);
	}
	const requestedTerminalId = normalizeTerminalDeviceId(props.deviceId);
	const selectedTerminal = terminalResult.terminals?.find(
		(terminal) =>
			terminal.value &&
			normalizeTerminalDeviceId(terminal.value) === requestedTerminalId &&
			terminal.status === "AVAILABLE",
	);
	if (!selectedTerminal?.value) {
		throw new Error(
			"The selected Square terminal is offline or unavailable. Refresh and select an online terminal.",
		);
	}
	await dependencies.verifySquareTerminalReady(selectedTerminal.value);

	logger.info("Creating Square terminal checkout", {
		amount: paymentCharge.chargeAmount,
		deviceIdSuffix: requestedTerminalId.slice(-4),
		orderCount: props.orderNos?.length || 0,
	});
	const checkout = await dependencies.createSquareTerminalCheckout({
		deviceId: selectedTerminal.value,
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
			paymentTerminal: selectedTerminal.value
				? {
						connectOrCreate: {
							where: {
								terminalId: selectedTerminal.value,
							},
							create: {
								terminalId: selectedTerminal.value,
								terminalName: selectedTerminal.label,
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
	dependencies: {
		cancelSquareTerminalPayment: typeof cancelSquareTerminalPayment;
		getTerminalPaymentStatus: typeof getTerminalPaymentStatus;
	} = { cancelSquareTerminalPayment, getTerminalPaymentStatus },
) {
	let status: string | undefined;
	if (input.checkoutId) {
		const current = await dependencies.getTerminalPaymentStatus(
			input.checkoutId,
		);
		status = current.status;
		if (status === "COMPLETED") throw new Error("Payment already received!");
		if (status !== "CANCELED") {
			status = (
				await dependencies.cancelSquareTerminalPayment(input.checkoutId)
			).status;
		}
	}
	if (status === "CANCELED") {
		await ctx.db.squarePayments.updateMany({
			where: {
				...(input.squarePaymentId ? { id: input.squarePaymentId } : {}),
				...(input.checkoutId ? { paymentId: input.checkoutId } : {}),
				status: {
					not: "COMPLETED",
				},
			},
			data: {
				status: "CANCELED",
			},
		});
	}
	return { ok: true, status };
}

export async function getSalesPaymentProcessorTerminalStatus(
	ctx: TRPCContext,
	input: z.infer<typeof salesPaymentProcessorTerminalStatusSchema>,
) {
	return reconcileSalesPaymentProcessorTerminalStatus(ctx, input);
}

export async function reconcileSalesPaymentProcessorTerminalStatus(
	ctx: TRPCContext,
	input: z.infer<typeof salesPaymentProcessorTerminalStatusSchema>,
	dependencies: {
		getTerminalPaymentStatus: typeof getTerminalPaymentStatus;
	} = { getTerminalPaymentStatus },
) {
	const { status, tip } = await dependencies.getTerminalPaymentStatus(
		input.checkoutId,
	);
	if (status === "CANCELED") {
		await ctx.db.squarePayments.updateMany({
			where: {
				paymentId: input.checkoutId,
				status: { not: "COMPLETED" },
			},
			data: { status: "CANCELED" },
		});
	}
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
