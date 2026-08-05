import { db } from "@gnd/db";
import {
	resolveSalesAdjustmentApplyClaim,
	resolveSalesAdjustmentStaleReason,
} from "@gnd/sales/adjustment-system";
import {
	createLegacyWalletCreditTransaction,
	mirrorLegacyRefundSalesPayment,
	projectLegacyOrderPayments,
} from "@gnd/sales/payment-system";
import { schemaTask, tasks } from "@trigger.dev/sdk/v3";
import {
	type ApplySalesOrderAdjustmentPayload,
	type TaskName,
	applySalesOrderAdjustmentSchema,
} from "../../schema";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export async function runApplySalesOrderAdjustment(
	payload: ApplySalesOrderAdjustmentPayload,
) {
	const claim = await db.salesOrderAdjustment.updateMany({
		where: { id: payload.adjustmentId, status: "APPROVED" },
		data: {
			status: "APPLYING",
			failureCode: null,
			failureMessage: null,
			failedAt: null,
		},
	});
	if (!claim.count) {
		const existing = await db.salesOrderAdjustment.findUnique({
			where: { id: payload.adjustmentId },
			select: { status: true },
		});
		const existingStatus = existing?.status;
		const claimResult = resolveSalesAdjustmentApplyClaim({
			claimCount: claim.count,
			currentStatus: existingStatus,
		});
		if (claimResult === "ALREADY_APPLIED") {
			return {
				adjustmentId: payload.adjustmentId,
				status: existingStatus || "APPLIED",
				idempotent: true,
			};
		}
		throw new Error(
			`Adjustment ${payload.adjustmentId} is not ready to apply.`,
		);
	}

	try {
		const result = await db.$transaction(async (tx) => {
			const adjustment = await tx.salesOrderAdjustment.findUnique({
				where: { id: payload.adjustmentId },
				include: {
					lines: true,
					order: {
						select: {
							id: true,
							orderId: true,
							slug: true,
							createdAt: true,
							updatedAt: true,
							meta: true,
							grandTotal: true,
							customerId: true,
							salesRepId: true,
							customer: { select: { walletId: true } },
							payments: {
								where: {
									deletedAt: null,
								},
								orderBy: { createdAt: "desc" },
								select: {
									id: true,
									transactionId: true,
									amount: true,
									status: true,
								},
							},
							items: {
								where: { deletedAt: null },
								select: {
									id: true,
									assignments: {
										where: { deletedAt: null },
										select: { qtyCompleted: true },
									},
									itemDeliveries: {
										where: { deletedAt: null },
										select: { qty: true, status: true },
									},
								},
							},
						},
					},
				},
			});
			if (!adjustment || adjustment.status !== "APPLYING") {
				throw new Error("Claimed adjustment could not be loaded.");
			}
			const currentMeta = record(adjustment.order.meta);
			const currentForm = record(currentMeta.newSalesForm);
			const liveVersion =
				typeof currentForm.version === "string" && currentForm.version
					? currentForm.version
					: `${adjustment.order.updatedAt?.getTime() || adjustment.order.createdAt?.getTime() || 0}-legacy`;
			const livePaymentTotal = projectLegacyOrderPayments({
				salesOrderId: adjustment.order.id,
				grandTotal: adjustment.order.grandTotal,
				payments: adjustment.order.payments,
			}).totalAllocated;
			const quantityFloorChanged = adjustment.lines.some((line) => {
				if (!line.salesOrderItemId) return false;
				const liveItem = adjustment.order.items.find(
					(item) => item.id === line.salesOrderItemId,
				);
				if (!liveItem) return true;
				const completedProductionQty = liveItem.assignments.reduce(
					(total, row) => total + Number(row.qtyCompleted || 0),
					0,
				);
				const fulfilledQty = liveItem.itemDeliveries
					.filter(
						(row) => String(row.status || "").toLowerCase() !== "cancelled",
					)
					.reduce((total, row) => total + Number(row.qty || 0), 0);
				return (
					Number(line.proposedQty) <
					Math.max(completedProductionQty, fulfilledQty)
				);
			});
			const staleReason = resolveSalesAdjustmentStaleReason({
				sourceVersion: adjustment.sourceVersion,
				liveVersion,
				approvedPaymentTotal: Number(adjustment.paymentTotal),
				livePaymentTotal,
				quantityFloorChanged,
			});
			if (staleReason) {
				await tx.salesOrderAdjustment.update({
					where: { id: adjustment.id },
					data: {
						status: "STALE",
						failureCode: staleReason,
						failureMessage:
							"The live sale, payment projection, or irreversible quantity changed after sales-representative approval.",
					},
				});
				return {
					stale: true,
					adjustment,
					walletTransactionId: null,
					refundSalesPaymentId: null,
				};
			}

			const proposed = record(adjustment.proposedSnapshot);
			const summary = record(proposed.summary);
			const proposedLines = Array.isArray(proposed.lineItems)
				? proposed.lineItems.map(record)
				: [];
			const proposedByUid = new Map(
				proposedLines.map((line) => [String(line.uid || ""), line]),
			);
			for (const line of adjustment.lines) {
				if (!line.salesOrderItemId) {
					throw new Error(
						`Adjustment line ${line.lineUid} is not linked to a persisted sale item.`,
					);
				}
				const proposedLine = proposedByUid.get(line.lineUid);
				await tx.salesOrderItems.update({
					where: { id: line.salesOrderItemId },
					data: {
						qty: Number(line.proposedQty),
						total: Number(line.proposedLineTotal),
						deletedAt: Number(line.proposedQty) === 0 ? new Date() : null,
						...(proposedLine
							? {
									rate: Number(proposedLine.unitPrice || 0),
									description: String(
										proposedLine.description ||
											proposedLine.title ||
											line.title,
									),
								}
							: {}),
					},
				});
			}

			const nextVersion = `${Date.now()}-adjustment-${adjustment.id.slice(-8)}`;
			const nextMeta = {
				...currentMeta,
				newSalesForm: {
					...currentForm,
					...proposed,
					version: nextVersion,
					updatedAt: new Date().toISOString(),
					autosave: false,
					approvedAdjustmentId: adjustment.id,
				},
			};
			await tx.salesOrders.update({
				where: { id: adjustment.salesOrderId },
				data: {
					subTotal: Number(summary.subTotal || 0),
					tax: Number(summary.taxTotal || 0),
					taxPercentage: Number(summary.taxRate || 0),
					grandTotal: Number(adjustment.proposedGrandTotal),
					amountDue: Number(adjustment.amountDueAfter),
					meta: nextMeta,
				},
			});

			let walletTransactionId: number | null = null;
			let refundSalesPaymentId: number | null = null;
			const walletCredit = Number(adjustment.walletCreditAmount);
			if (walletCredit > 0) {
				if (!adjustment.order.customerId)
					throw new Error("Wallet credit requires an order customer.");
				let walletId = adjustment.order.customer?.walletId || null;
				if (!walletId) {
					const wallet = await tx.customerWallet.create({
						data: { balance: 0 },
					});
					await tx.customers.update({
						where: { id: adjustment.order.customerId },
						data: { walletId: wallet.id },
					});
					walletId = wallet.id;
				}
				const sourcePayment = adjustment.order.payments.find(
					(payment) =>
						payment.transactionId != null &&
						payment.status === "success" &&
						Number(payment.amount || 0) > 0,
				);
				if (!sourcePayment?.transactionId) {
					throw new Error(
						"Wallet credit requires a transaction-linked successful payment.",
					);
				}
				const refundPayment = await tx.salesPayments.create({
					data: {
						orderId: adjustment.salesOrderId,
						transactionId: sourcePayment.transactionId,
						amount: -walletCredit,
						status: "success",
						origin: "sales-order-adjustment",
						meta: {
							adjustmentId: adjustment.id,
							sourcePaymentId: sourcePayment.id,
						},
					},
				});
				await mirrorLegacyRefundSalesPayment(tx, {
					amount: -walletCredit,
					customerTransactionId: sourcePayment.transactionId,
					salesId: adjustment.salesOrderId,
					salesPaymentId: refundPayment.id,
					walletId,
				});
				const walletTransaction = await createLegacyWalletCreditTransaction(
					tx,
					{
						walletId,
						amount: walletCredit,
						reason: "sales-rep-approved-sales-quantity-adjustment",
						note: `Wallet credit for sales-representative-approved adjustment to sale ${adjustment.order.orderId}`,
						authorId: adjustment.appliedById || adjustment.requestedById,
						meta: {
							adjustmentId: adjustment.id,
							salesOrderId: adjustment.salesOrderId,
						},
					},
				);
				walletTransactionId = walletTransaction.id;
				refundSalesPaymentId = refundPayment.id;
			}

			const commitments = record(adjustment.commitmentSnapshot);
			const needsOperationalReview = [
				commitments.allocatedQty,
				commitments.inboundQty,
				commitments.productionQty,
				commitments.fulfilledQty,
			].some((value) => Number(value || 0) > 0);
			const status = needsOperationalReview ? "APPLIED_WITH_REVIEW" : "APPLIED";
			await tx.salesOrderAdjustment.update({
				where: { id: adjustment.id },
				data: {
					status,
					appliedAt: new Date(),
					walletTransactionId,
					refundSalesPaymentId,
				},
			});
			if (adjustment.order.salesRepId) {
				await tx.notifications.create({
					data: {
						type: "sales-order-adjustment",
						fromUserId: adjustment.requestedById,
						userId: adjustment.order.salesRepId,
						message: needsOperationalReview
							? `Sale ${adjustment.order.orderId} was adjusted and needs operational review.`
							: `Sale ${adjustment.order.orderId} was adjusted with sales-representative approval.`,
						alert: true,
						link: `/sales/${adjustment.order.slug}`,
						meta: { adjustmentId: adjustment.id },
					},
				});
			}
			return {
				stale: false,
				adjustment,
				status,
				walletTransactionId,
				refundSalesPaymentId,
			};
		});

		if (result.stale)
			return { adjustmentId: payload.adjustmentId, status: "STALE" as const };
		await Promise.all([
			tasks.trigger("sync-sales-inventory-line-items", {
				salesOrderId: result.adjustment.salesOrderId,
				source: "adjustment",
				triggeredByUserId: result.adjustment.requestedById,
			}),
			tasks.trigger("create-sales-history", {
				salesNo: result.adjustment.order.orderId,
				salesType: "order",
				author: {
					id: result.adjustment.requestedById,
					name: "Sales-representative-approved adjustment",
				},
			}),
			...(
				["invoice", "production", "packing-slip", "order-packing"] as const
			).map((mode) =>
				tasks.trigger("warm-sales-document-snapshot", {
					salesOrderId: result.adjustment.salesOrderId,
					mode,
					forceRegenerate: true,
				}),
			),
		]);
		return {
			adjustmentId: payload.adjustmentId,
			status: result.status,
			walletTransactionId: result.walletTransactionId,
			refundSalesPaymentId: result.refundSalesPaymentId,
		};
	} catch (error) {
		await db.salesOrderAdjustment.updateMany({
			where: { id: payload.adjustmentId, status: "APPLYING" },
			data: {
				status: "FAILED",
				failureCode: "APPLY_FAILED",
				failureMessage: error instanceof Error ? error.message : String(error),
				failedAt: new Date(),
			},
		});
		throw error;
	}
}

export const applySalesOrderAdjustmentTask = schemaTask({
	id: "apply-sales-order-adjustment" as TaskName,
	schema: applySalesOrderAdjustmentSchema,
	maxDuration: 120,
	queue: { concurrencyLimit: 5 },
	run: runApplySalesOrderAdjustment,
});
