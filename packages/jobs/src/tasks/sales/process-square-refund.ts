import { getUserIdsWithPermission } from "@gnd/auth/utils";
import { db } from "@gnd/db";
import { createNoteAction } from "@gnd/notifications/note";
import { sendPaymentSystemNotifications } from "@gnd/notifications/payment-system";
import { NotificationService } from "@gnd/notifications/services/triggers";
import { noteTagFilter } from "@gnd/notifications/utils";
import {
	type PaymentSystemNotificationEvent,
	type SalesPaymentRefundedNotificationPayload,
	repairLegacySalesPaymentBalance,
} from "@gnd/sales/payment-system";
import { normalizeSquareRefundStatus } from "@gnd/sales/payment-system/refunds";
import { createSquarePaymentRefund, getSquarePaymentRefund } from "@gnd/square";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import type { TaskName } from "../../schema";

export const processSquareSalesRefundSchema = z.object({
	refundId: z.string().min(1),
});

function refundEvent(input: {
	authorId: number;
	amount: number;
	reason: string;
	salesId: number;
	orderNo: string;
	customerName?: string | null;
	salesRepId?: number | null;
	salesRepEmail?: string | null;
}): PaymentSystemNotificationEvent<SalesPaymentRefundedNotificationPayload> {
	return {
		type: "sales_payment_refunded",
		recipientEmployeeId: input.salesRepId ?? null,
		recipientEmail: input.salesRepEmail || undefined,
		author: { id: input.authorId, role: "employee" },
		payload: {
			amount: input.amount,
			customerName: input.customerName || undefined,
			orderNo: input.orderNo,
			reason: input.reason,
			salesId: input.salesId,
		},
	};
}

export async function applyCompletedSquareRefund(refundId: string) {
	const result = await db.$transaction(async (tx) => {
		const refund = await tx.salesSquareRefund.findUniqueOrThrow({
			where: { id: refundId },
			include: { tender: true, allocations: true },
		});
		if (refund.providerStatus !== "completed") {
			return {
				applied: false,
				events: [],
				orders: [],
				authorId: refund.initiatedById || 1,
				reason: refund.reason,
			};
		}
		if (refund.applicationStatus === "applied") {
			return {
				applied: true,
				events: [],
				orders: [],
				authorId: refund.initiatedById || 1,
				reason: refund.reason,
			};
		}
		if (
			refund.applicationStatus === "awaiting_allocation" ||
			!refund.allocations.length
		) {
			return {
				applied: false,
				events: [],
				orders: [],
				authorId: refund.initiatedById || 1,
				reason: refund.reason,
			};
		}
		const claimed = await tx.salesSquareRefund.updateMany({
			where: {
				id: refund.id,
				version: refund.version,
				applicationStatus: {
					in: ["reserved", "ready_to_apply", "apply_failed"],
				},
			},
			data: { applicationStatus: "applying", version: { increment: 1 } },
		});
		if (claimed.count !== 1) {
			return {
				applied: false,
				events: [],
				orders: [],
				authorId: refund.initiatedById || 1,
				reason: refund.reason,
			};
		}

		const salesOrders = await tx.salesOrders.findMany({
			where: {
				id: { in: refund.allocations.map((item) => item.salesOrderId) },
			},
			select: {
				id: true,
				orderId: true,
				customerId: true,
				salesRepId: true,
				status: true,
				deliveredAt: true,
				customer: {
					select: {
						walletId: true,
						name: true,
						businessName: true,
						email: true,
					},
				},
				salesRep: { select: { email: true } },
			},
		});
		const orderById = new Map(salesOrders.map((order) => [order.id, order]));
		const allocationByOrderId = new Map(
			refund.allocations.map((allocation) => [
				allocation.salesOrderId,
				allocation,
			]),
		);
		const tenderMeta =
			refund.tender.meta &&
			typeof refund.tender.meta === "object" &&
			!Array.isArray(refund.tender.meta)
				? (refund.tender.meta as Record<string, unknown>)
				: {};
		const paymentProcessingFeeCents = Number(
			tenderMeta.processingFeeCents || 0,
		);
		const retainedProcessingFeeCents = Math.round(
			paymentProcessingFeeCents *
				(refund.amountCents / Math.max(1, refund.tender.amountCents)),
		);
		const walletId = salesOrders.find((order) => order.customer?.walletId)
			?.customer?.walletId;
		const customerTransaction = await tx.customerTransaction.create({
			data: {
				authorId: refund.initiatedById,
				amount: -refund.amountCents / 100,
				walletId,
				paymentMethod: "square-refund",
				type: "transaction",
				status: "success",
				statusReason: refund.reason,
				description:
					refund.note ||
					`Square refund ${refund.providerRefundId || refund.id}`,
				meta: {
					refundId: refund.id,
					providerRefundId: refund.providerRefundId,
					principalCents: refund.principalCents,
					cccCents: refund.cccCents,
					tipCents: refund.tipCents,
					retainedSquareProcessingFeeCents: retainedProcessingFeeCents,
				},
			},
		});

		const events: PaymentSystemNotificationEvent<SalesPaymentRefundedNotificationPayload>[] =
			[];
		for (const allocation of refund.allocations) {
			const order = orderById.get(allocation.salesOrderId);
			if (!order)
				throw new Error("Refund allocation sales order no longer exists.");
			const allocatedTotalCents =
				allocation.principalCents + allocation.cccCents + allocation.tipCents;
			const allocatedRetainedFeeCents = Math.round(
				retainedProcessingFeeCents *
					(allocatedTotalCents / Math.max(1, refund.amountCents)),
			);
			const salesPayment = await tx.salesPayments.create({
				data: {
					authorId: refund.initiatedById,
					transactionId: customerTransaction.id,
					orderId: allocation.salesOrderId,
					squarePaymentsId: refund.tender.legacySquarePaymentId,
					amount: -allocation.principalCents / 100,
					tip: -allocation.tipCents / 100,
					status: "success",
					origin: "square_refund",
					note: refund.note,
					meta: {
						refundId: refund.id,
						providerRefundId: refund.providerRefundId,
						cccCents: allocation.cccCents,
						tipCents: allocation.tipCents,
						retainedSquareProcessingFeeCents: allocatedRetainedFeeCents,
					},
				},
			});
			await tx.salesSquareRefundAllocation.update({
				where: { id: allocation.id },
				data: { appliedSalesPaymentId: salesPayment.id },
			});
			const ledger = await tx.paymentLedgerEntry.create({
				data: {
					entryType: "square_refund_completed",
					status: "posted",
					amount: -allocatedTotalCents / 100,
					currency: refund.currency,
					idempotencyKey: `${refund.idempotencyKey}:${allocation.salesOrderId}`,
					salesOrderId: allocation.salesOrderId,
					walletId,
					customerTxId: customerTransaction.id,
					salesPaymentId: salesPayment.id,
					squarePaymentId: refund.tender.providerPaymentId,
					refundId: refund.providerRefundId || refund.id,
					authorId: refund.initiatedById,
					meta: {
						refundIntentId: refund.id,
						cccCents: allocation.cccCents,
						tipCents: allocation.tipCents,
						retainedSquareProcessingFeeCents: allocatedRetainedFeeCents,
					},
				},
			});
			await tx.paymentAllocation.create({
				data: {
					ledgerEntryId: ledger.id,
					salesOrderId: allocation.salesOrderId,
					amount: -allocatedTotalCents / 100,
					allocationType: "square_refund",
					meta: { refundIntentId: refund.id },
				},
			});
			const repairedOrder = await repairLegacySalesPaymentBalance(tx, {
				salesId: allocation.salesOrderId,
			});
			if (
				Number(repairedOrder?.amountDue || 0) > 0 &&
				(order.deliveredAt ||
					["completed", "fulfilled"].includes(
						order.status?.toLowerCase() || "",
					))
			) {
				const resolutionCase = await tx.resolutionCase.create({
					data: {
						scopeType: "square_refund",
						scopeId: `${refund.id}:${order.id}`,
						status: "open",
						summary: `Square refund reopened a balance on fulfilled order ${order.orderId}.`,
						meta: {
							refundId: refund.id,
							providerRefundId: refund.providerRefundId,
							salesOrderId: order.id,
							orderNo: order.orderId,
							amountDue: Number(repairedOrder?.amountDue || 0),
						},
					},
				});
				await tx.resolutionFinding.create({
					data: {
						resolutionCaseId: resolutionCase.id,
						findingType: "fulfilled_order_balance_reopened",
						severity: "high",
						snapshot: {
							refundId: refund.id,
							orderNo: order.orderId,
							amountDue: Number(repairedOrder?.amountDue || 0),
						},
					},
				});
			}
			const event = refundEvent({
				authorId: refund.initiatedById || 1,
				amount: allocatedTotalCents / 100,
				reason: refund.reason,
				salesId: order.id,
				orderNo: order.orderId,
				customerName: order.customer?.businessName || order.customer?.name,
				salesRepId: order.salesRepId,
				salesRepEmail: order.salesRep?.email,
			});
			events.push(event);
		}

		await tx.salesSquareRefund.update({
			where: { id: refund.id },
			data: {
				applicationStatus: "applied",
				appliedAt: new Date(),
				reservedCents: 0,
				version: { increment: 1 },
				transitions: {
					create: {
						providerStatus: "completed",
						applicationStatus: "applied",
						source: "projection",
						message: "Completed Square refund applied to sales and Finance.",
					},
				},
			},
		});
		return {
			applied: true,
			events,
			orders: salesOrders.map((order) => {
				const allocation = allocationByOrderId.get(order.id);
				return {
					...order,
					refundAmount:
						((allocation?.principalCents || 0) +
							(allocation?.cccCents || 0) +
							(allocation?.tipCents || 0)) /
						100,
				};
			}),
			authorId: refund.initiatedById || 1,
			reason: refund.reason,
		};
	});

	if (result.events.length) {
		await sendPaymentSystemNotifications(
			tasks,
			{ db, userId: result.authorId },
			result.events,
		);
	}
	if (result.applied && result.orders.length) {
		const recipients = await getUserIdsWithPermission(db, "edit refund square");
		recipients.add(result.authorId);
		if (recipients.size) {
			await db.notifications.createMany({
				data: Array.from(recipients).map((userId) => ({
					type: "square-refund-completed",
					fromUserId: result.authorId,
					userId,
					message: `Square refund completed and applied to ${result.orders.map((order) => order.orderId).join(", ")}.`,
					alert: true,
					link: `/sales-book/orders?sales-overview-id=${encodeURIComponent(result.orders[0]?.orderId || "")}&sales-type=order&mode=sales&salesTab=transactions`,
					meta: { refundId, applicationStatus: "applied" },
				})),
			});
		}
	}
	const customers = new Map<
		string,
		{ name: string; orders: Array<{ salesId: number; orderNo: string }> }
	>();
	for (const order of result.orders) {
		if (!order.customer?.email) continue;
		const customer = customers.get(order.customer.email) || {
			name: order.customer.businessName || order.customer.name || "Customer",
			orders: [],
		};
		customer.orders.push({ salesId: order.id, orderNo: order.orderId });
		customers.set(order.customer.email, customer);
	}
	for (const [customerEmail, customer] of customers) {
		await new NotificationService(tasks, { db, userId: result.authorId }).send(
			"sales_customer_refund_completed",
			{
				author: { id: result.authorId, role: "employee" },
				payload: {
					customerEmail,
					customerName: customer.name,
					refundId,
					totalAmount: result.orders
						.filter((order) => order.customer?.email === customerEmail)
						.reduce((sum, order) => sum + order.refundAmount, 0),
					reason: result.reason,
					sales: customer.orders,
				},
			},
		);
	}
	if (result.applied) {
		await Promise.allSettled(
			result.orders.flatMap((order) => [
				tasks.trigger("create-sales-history", {
					salesNo: order.orderId,
					salesType: "order",
					author: { id: result.authorId, name: "Square refund completed" },
				}),
				tasks.trigger("warm-sales-document-snapshot", {
					salesOrderId: order.id,
					mode: "invoice",
					forceRegenerate: true,
				}),
			]),
		);
	}
	return result;
}

export async function processSquareSalesRefund(refundId: string) {
	const refund = await db.salesSquareRefund.findUniqueOrThrow({
		where: { id: refundId },
		include: { tender: true, allocations: true },
	});
	if (refund.applicationStatus === "applied") return { status: "applied" };
	const providerRefund = refund.providerRefundId
		? await getSquarePaymentRefund(refund.providerRefundId)
		: await createSquarePaymentRefund({
				providerPaymentId: refund.tender.providerPaymentId,
				amountCents: refund.amountCents,
				currency: refund.currency,
				idempotencyKey: refund.idempotencyKey,
				reason: refund.reason,
			});
	const providerStatus = normalizeSquareRefundStatus(providerRefund.status);
	const providerStatusChanged = providerStatus !== refund.providerStatus;
	const applicationStatus =
		providerStatus === "completed"
			? refund.origin === "external" && !refund.allocations.length
				? "awaiting_allocation"
				: "ready_to_apply"
			: providerStatus === "pending"
				? "reserved"
				: "apply_failed";
	await db.salesSquareRefund.update({
		where: { id: refund.id },
		data: {
			providerRefundId: providerRefund.id,
			providerStatus,
			applicationStatus,
			providerCreatedAt: providerRefund.createdAt,
			completedAt: providerStatus === "completed" ? new Date() : null,
			reservedCents: providerStatus === "pending" ? refund.amountCents : 0,
			failureDetail:
				providerStatus === "failed" || providerStatus === "rejected"
					? `Square refund ${providerStatus}.`
					: null,
			version: { increment: 1 },
			transitions: providerStatusChanged
				? {
						create: {
							providerStatus,
							applicationStatus,
							source: "square_api",
							message: `Square refund is ${providerStatus}.`,
							snapshot: {
								providerRefundId: providerRefund.id,
								updatedAt: providerRefund.updatedAt,
							},
						},
					}
				: undefined,
		},
	});
	if (providerStatusChanged && providerStatus !== "completed") {
		const orders = await db.salesOrders.findMany({
			where: {
				id: {
					in: refund.allocations.map((allocation) => allocation.salesOrderId),
				},
			},
			select: { id: true, orderId: true },
		});
		await Promise.allSettled(
			orders.map((order) =>
				createNoteAction({
					db,
					authorId: refund.initiatedById || 1,
					subject: `Square refund ${providerStatus}`,
					headline: `Square refund ${providerStatus}`,
					note:
						providerStatus === "pending"
							? "Square accepted the refund request. The invoice balance is unchanged until completion."
							: "Square did not complete the refund. Finance review is required.",
					tags: [
						noteTagFilter("salesId", String(order.id)),
						noteTagFilter("salesNo", order.orderId),
						noteTagFilter("paymentId", refund.id),
						noteTagFilter("channel", "sales_payment_refunded"),
					],
				}),
			),
		);
		if (providerStatus === "failed" || providerStatus === "rejected") {
			const recipients = await getUserIdsWithPermission(
				db,
				"edit refund square",
			);
			if (refund.initiatedById) recipients.add(refund.initiatedById);
			if (recipients.size)
				await db.notifications.createMany({
					data: Array.from(recipients).map((userId) => ({
						type: "square-refund-review",
						fromUserId: refund.initiatedById || 1,
						userId,
						message: `Square refund ${providerStatus}. Open Sales Finance to review it.`,
						alert: true,
						link: "/sales-book/finance?tab=review",
						meta: { refundId: refund.id, providerStatus },
					})),
				});
		}
	}
	if (providerStatus === "completed")
		return applyCompletedSquareRefund(refund.id);
	return { status: providerStatus };
}

export const processSquareSalesRefundTask = schemaTask({
	id: "process-square-sales-refund" as TaskName,
	schema: processSquareSalesRefundSchema,
	queue: { concurrencyLimit: 5 },
	maxDuration: 120,
	run: async ({ refundId }) => {
		logger.info("Processing Square sales refund", { refundId });
		return processSquareSalesRefund(refundId);
	},
});
