import type { TRPCContext } from "@api/trpc/init";
import { Prisma } from "@gnd/db";
import {
	ACTIVE_REFUND_PROVIDER_STATUSES,
	assertRefundIntent,
	createRefundIdempotencyKey,
	refundTotalCents,
	remainingRefundableCents,
} from "@gnd/sales/payment-system/refunds";
import { tasks } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import type {
	allocateExternalSalesSquareRefundSchema,
	createSalesSquareRefundSchema,
	salesRefundOverviewSchema,
} from "../../schemas/sales-refunds";

const toCents = (amount: number | null | undefined) =>
	Math.round(Number(amount || 0) * 100);

export async function getSalesRefundOverview(
	ctx: TRPCContext,
	input: z.infer<typeof salesRefundOverviewSchema>,
) {
	const order = await ctx.db.salesOrders.findFirstOrThrow({
		where: { orderId: input.orderNo, deletedAt: null },
		select: {
			id: true,
			orderId: true,
			grandTotal: true,
			amountDue: true,
			payments: {
				where: {
					deletedAt: null,
					OR: [{ origin: null }, { origin: { not: "square_refund" } }],
				},
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					amount: true,
					tip: true,
					status: true,
					origin: true,
					createdAt: true,
					note: true,
					meta: true,
					transaction: {
						select: {
							id: true,
							paymentMethod: true,
							status: true,
							description: true,
							createdAt: true,
							author: { select: { name: true } },
						},
					},
					squarePayments: {
						select: {
							id: true,
							paymentId: true,
							status: true,
							paymentMethod: true,
							squareOrderId: true,
						},
					},
				},
			},
		},
	});

	const legacySquareIds = order.payments
		.map((payment) => payment.squarePayments?.id)
		.filter((id): id is string => Boolean(id));
	const tenders = legacySquareIds.length
		? await ctx.db.squareTenderPayment.findMany({
				where: { legacySquarePaymentId: { in: legacySquareIds } },
				include: {
					refunds: {
						include: {
							allocations: {
								where: { salesOrderId: order.id },
							},
						},
						orderBy: { createdAt: "desc" },
					},
				},
			})
		: [];
	const paymentOrderLinks = legacySquareIds.length
		? await ctx.db.squarePaymentOrders.findMany({
				where: { squarePaymentId: { in: legacySquareIds } },
				select: {
					squarePaymentId: true,
					order: {
						select: {
							id: true,
							orderId: true,
							amountDue: true,
							grandTotal: true,
						},
					},
				},
			})
		: [];
	const eligibleOrdersByLegacyId = new Map<
		string,
		Array<{
			id: number;
			orderNo: string;
			amountDueCents: number;
			grandTotalCents: number;
		}>
	>();
	for (const link of paymentOrderLinks) {
		if (!link.order) continue;
		const list = eligibleOrdersByLegacyId.get(link.squarePaymentId) || [];
		list.push({
			id: link.order.id,
			orderNo: link.order.orderId,
			amountDueCents: toCents(link.order.amountDue),
			grandTotalCents: toCents(link.order.grandTotal),
		});
		eligibleOrdersByLegacyId.set(link.squarePaymentId, list);
	}
	const tendersByLegacyId = new Map(
		tenders.map((tender) => [tender.legacySquarePaymentId, tender]),
	);

	const transactions = order.payments.map((payment) => {
		const tender = payment.squarePayments?.id
			? tendersByLegacyId.get(payment.squarePayments.id)
			: null;
		const completedRefundCents = tender
			? tender.refunds
					.filter((refund) => refund.providerStatus === "completed")
					.reduce((sum, refund) => sum + refund.amountCents, 0)
			: 0;
		const pendingRefundCents = tender
			? tender.refunds
					.filter((refund) =>
						ACTIVE_REFUND_PROVIDER_STATUSES.includes(
							refund.providerStatus as (typeof ACTIVE_REFUND_PROVIDER_STATUSES)[number],
						),
					)
					.reduce((sum, refund) => sum + refund.reservedCents, 0)
			: 0;
		const receivedCents = tender?.amountCents || toCents(payment.amount);
		return {
			id: `payment:${payment.id}`,
			salesPaymentId: payment.id,
			transactionId: payment.transaction?.id || null,
			kind: "payment" as const,
			createdAt: payment.transaction?.createdAt || payment.createdAt,
			description:
				payment.transaction?.description || payment.note || "Sales payment",
			paymentMethod:
				payment.transaction?.paymentMethod ||
				payment.squarePayments?.paymentMethod ||
				"other",
			status: tender?.status || payment.transaction?.status || payment.status,
			authorName: payment.transaction?.author?.name || null,
			receivedCents,
			completedRefundCents,
			pendingRefundCents,
			netCents: receivedCents - completedRefundCents,
			remainingRefundableCents: tender
				? remainingRefundableCents({
						paymentAmountCents: tender.amountCents,
						completedRefundCents,
						reservedRefundCents: pendingRefundCents,
					})
				: 0,
			refundable: Boolean(
				tender &&
					tender.status.toUpperCase() === "COMPLETED" &&
					remainingRefundableCents({
						paymentAmountCents: tender.amountCents,
						completedRefundCents,
						reservedRefundCents: pendingRefundCents,
					}) > 0,
			),
			tender: tender
				? {
						id: tender.id,
						providerPaymentId: tender.providerPaymentId,
						amountCents: tender.amountCents,
						tipCents: tender.tipCents,
						currency: tender.currency,
						eligibleOrders: eligibleOrdersByLegacyId.get(
							tender.legacySquarePaymentId || "",
						) || [
							{
								id: order.id,
								orderNo: order.orderId,
								amountDueCents: toCents(order.amountDue),
								grandTotalCents: toCents(order.grandTotal),
							},
						],
					}
				: null,
			refunds:
				tender?.refunds.map((refund) => ({
					id: refund.id,
					providerRefundId: refund.providerRefundId,
					providerStatus: refund.providerStatus,
					applicationStatus: refund.applicationStatus,
					origin: refund.origin,
					amountCents: refund.amountCents,
					principalCents: refund.principalCents,
					cccCents: refund.cccCents,
					tipCents: refund.tipCents,
					reason: refund.reason,
					note: refund.note,
					createdAt: refund.createdAt,
					completedAt: refund.completedAt,
					failureDetail: refund.failureDetail,
				})) || [],
		};
	});

	const summary = transactions.reduce(
		(acc, item) => ({
			receivedCents: acc.receivedCents + item.receivedCents,
			completedRefundCents:
				acc.completedRefundCents + item.completedRefundCents,
			pendingRefundCents: acc.pendingRefundCents + item.pendingRefundCents,
		}),
		{ receivedCents: 0, completedRefundCents: 0, pendingRefundCents: 0 },
	);
	return {
		order: {
			id: order.id,
			orderNo: order.orderId,
			grandTotalCents: toCents(order.grandTotal),
			amountDueCents: toCents(order.amountDue),
		},
		summary: {
			...summary,
			netCents: summary.receivedCents - summary.completedRefundCents,
		},
		transactions,
	};
}

export async function getExternalSquareRefundReviewQueue(ctx: TRPCContext) {
	const refunds = await ctx.db.salesSquareRefund.findMany({
		where: {
			origin: "external",
			applicationStatus: "awaiting_allocation",
		},
		include: { tender: true },
		orderBy: { createdAt: "asc" },
	});
	const legacyIds = refunds
		.map((refund) => refund.tender.legacySquarePaymentId)
		.filter((id): id is string => Boolean(id));
	const links = legacyIds.length
		? await ctx.db.squarePaymentOrders.findMany({
				where: { squarePaymentId: { in: legacyIds } },
				select: {
					squarePaymentId: true,
					order: {
						select: {
							id: true,
							orderId: true,
							grandTotal: true,
							amountDue: true,
						},
					},
				},
			})
		: [];
	const ordersByLegacyId = new Map<
		string,
		Array<{
			id: number;
			orderNo: string;
			grandTotalCents: number;
			amountDueCents: number;
		}>
	>();
	for (const link of links) {
		if (!link.order) continue;
		const orders = ordersByLegacyId.get(link.squarePaymentId) || [];
		orders.push({
			id: link.order.id,
			orderNo: link.order.orderId,
			grandTotalCents: toCents(link.order.grandTotal),
			amountDueCents: toCents(link.order.amountDue),
		});
		ordersByLegacyId.set(link.squarePaymentId, orders);
	}
	return refunds.map((refund) => ({
		id: refund.id,
		providerRefundId: refund.providerRefundId,
		providerPaymentId: refund.tender.providerPaymentId,
		providerStatus: refund.providerStatus,
		amountCents: refund.amountCents,
		currency: refund.currency,
		reason: refund.reason,
		createdAt: refund.createdAt,
		eligibleOrders:
			ordersByLegacyId.get(refund.tender.legacySquarePaymentId || "") || [],
	}));
}

export async function createSalesSquareRefundIntent(
	ctx: TRPCContext & { userId: number },
	input: z.infer<typeof createSalesSquareRefundSchema>,
) {
	const refund = await ctx.db.$transaction(
		async (tx) => {
			const tender = await tx.squareTenderPayment.findUniqueOrThrow({
				where: { id: input.tenderPaymentId },
				include: {
					refunds: {
						where: {
							providerStatus: {
								in: ["not_submitted", "pending", "completed"],
							},
						},
					},
				},
			});
			const completed = tender.refunds.filter(
				(item) => item.providerStatus === "completed",
			);
			if (tender.refunds.length >= 20) {
				throw new Error("Square allows at most 20 refunds for one payment.");
			}
			const completedRefundCents = completed.reduce(
				(sum, item) => sum + item.amountCents,
				0,
			);
			const reservedRefundCents = tender.refunds
				.filter((item) => item.providerStatus !== "completed")
				.reduce((sum, item) => sum + item.reservedCents, 0);
			const allowedOrderIds = new Set<number>();
			if (tender.legacySquarePaymentId) {
				const [links, payments] = await Promise.all([
					tx.squarePaymentOrders.findMany({
						where: { squarePaymentId: tender.legacySquarePaymentId },
						select: { orderId: true },
					}),
					tx.salesPayments.findMany({
						where: {
							squarePaymentsId: tender.legacySquarePaymentId,
							deletedAt: null,
						},
						select: { orderId: true },
					}),
				]);
				for (const link of links) allowedOrderIds.add(link.orderId);
				for (const payment of payments) allowedOrderIds.add(payment.orderId);
			}
			if (
				input.allocations.some(
					(allocation) => !allowedOrderIds.has(allocation.salesOrderId),
				)
			) {
				throw new Error(
					"Refund allocation includes an order outside this payment.",
				);
			}
			const money = {
				principalCents: input.principalCents,
				cccCents: input.cccCents,
				tipCents: input.tipCents,
			};
			const { totalCents } = assertRefundIntent({
				paymentStatus: tender.status,
				paidAt: tender.paidAt,
				remainingCents: remainingRefundableCents({
					paymentAmountCents: tender.amountCents,
					completedRefundCents,
					reservedRefundCents,
				}),
				money,
				allocations: input.allocations,
			});
			return tx.salesSquareRefund.create({
				data: {
					tenderPaymentId: tender.id,
					idempotencyKey: createRefundIdempotencyKey(),
					amountCents: totalCents,
					principalCents: input.principalCents,
					cccCents: input.cccCents,
					tipCents: input.tipCents,
					reservedCents: totalCents,
					currency: tender.currency,
					reason: input.reason,
					note: input.note,
					commercialActionType: input.commercialActionType,
					commercialActionId: input.commercialActionId,
					initiatedById: ctx.userId,
					allocations: { create: input.allocations },
					transitions: {
						create: {
							providerStatus: "not_submitted",
							applicationStatus: "reserved",
							source: "user",
							actorId: ctx.userId,
							message: "Refund requested and amount reserved.",
						},
					},
				},
			});
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
	let queued = true;
	try {
		await tasks.trigger("process-square-sales-refund", { refundId: refund.id });
	} catch {
		queued = false;
	}
	return { refundId: refund.id, status: refund.providerStatus, queued };
}

export async function allocateExternalSalesSquareRefund(
	ctx: TRPCContext & { userId: number },
	input: z.infer<typeof allocateExternalSalesSquareRefundSchema>,
) {
	const allocated = await ctx.db.$transaction(async (tx) => {
		const refund = await tx.salesSquareRefund.findUniqueOrThrow({
			where: { id: input.refundId },
			include: { allocations: true, tender: true },
		});
		if (
			refund.origin !== "external" ||
			refund.providerStatus !== "completed" ||
			refund.applicationStatus !== "awaiting_allocation"
		) {
			throw new Error(
				"Only an unallocated completed external refund can be assigned.",
			);
		}
		const money = input.allocations.reduce(
			(acc, allocation) => ({
				principalCents: acc.principalCents + allocation.principalCents,
				cccCents: acc.cccCents + allocation.cccCents,
				tipCents: acc.tipCents + allocation.tipCents,
			}),
			{ principalCents: 0, cccCents: 0, tipCents: 0 },
		);
		const allowedOrderIds = new Set<number>();
		if (refund.tender.legacySquarePaymentId) {
			const [links, payments] = await Promise.all([
				tx.squarePaymentOrders.findMany({
					where: {
						squarePaymentId: refund.tender.legacySquarePaymentId,
					},
					select: { orderId: true },
				}),
				tx.salesPayments.findMany({
					where: {
						squarePaymentsId: refund.tender.legacySquarePaymentId,
						deletedAt: null,
					},
					select: { orderId: true },
				}),
			]);
			for (const link of links) allowedOrderIds.add(link.orderId);
			for (const payment of payments) allowedOrderIds.add(payment.orderId);
		}
		if (
			input.allocations.some(
				(allocation) => !allowedOrderIds.has(allocation.salesOrderId),
			)
		) {
			throw new Error(
				"External refund allocation includes an order outside the verified original tender.",
			);
		}
		if (refundTotalCents(money) !== refund.amountCents) {
			throw new Error(
				"External refund allocations must equal the Square refund total.",
			);
		}
		assertRefundIntent({
			paymentStatus: "COMPLETED",
			paidAt: new Date(),
			remainingCents: refund.amountCents,
			money,
			allocations: input.allocations,
		});
		await tx.salesSquareRefundAllocation.createMany({
			data: input.allocations.map((allocation) => ({
				...allocation,
				refundId: refund.id,
			})),
		});
		return tx.salesSquareRefund.update({
			where: { id: refund.id, version: refund.version },
			data: {
				principalCents: money.principalCents,
				cccCents: money.cccCents,
				tipCents: money.tipCents,
				applicationStatus: "ready_to_apply",
				version: { increment: 1 },
				transitions: {
					create: {
						providerStatus: refund.providerStatus,
						applicationStatus: "ready_to_apply",
						source: "user",
						actorId: ctx.userId,
						message: "External Square refund allocations approved.",
					},
				},
			},
		});
	});
	await tasks.trigger("process-square-sales-refund", {
		refundId: allocated.id,
	});
	return allocated;
}

export async function retrySalesSquareRefund(refundId: string) {
	const refund = await tasks.trigger("process-square-sales-refund", {
		refundId,
	});
	return { queued: true, runId: refund.id };
}
