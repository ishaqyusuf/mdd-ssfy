import { type TransactionClient, db } from "@gnd/db";
import {
	type SalesAdjustmentInboundDisposition,
	SalesAdjustmentInboundSnapshotConflictError,
	reconcileSalesAdjustmentInboundDemands,
} from "@gnd/inventory";
import {
	resolveSalesAdjustmentApplyClaim,
	resolveSalesAdjustmentStaleReason,
} from "@gnd/sales/adjustment-system";
import { prepareSalesDocumentReadiness } from "@gnd/sales/document-readiness";
import {
	createLegacyWalletCreditTransaction,
	mirrorLegacyRefundSalesPayment,
	projectLegacyOrderPayments,
} from "@gnd/sales/payment-system";
import { runSalesInventoryProjectionSync } from "@gnd/sales/run-sales-inventory-projection-sync";
import {
	getSalesDoorActiveIdentity,
	normalizeSalesDoorDimension,
} from "@gnd/sales/sales-form";
import { schemaTask, tasks } from "@trigger.dev/sdk/v3";
import {
	type ApplySalesOrderAdjustmentPayload,
	type TaskName,
	applySalesOrderAdjustmentSchema,
} from "../../schema";
import {
	claimExpiredSalesAdjustmentApply,
	getCommittedSalesAdjustmentCheckpoint,
	resolveSalesAdjustmentApplyRecovery,
} from "./sales-adjustment-apply-recovery";
import { projectApprovedGroupedSalesLine } from "./sales-adjustment-grouped-projection";
import {
	projectApprovedSalesTaxes,
	projectApprovedShelfSalesLine,
} from "./sales-adjustment-relational-projection";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

async function projectApprovedHousePackageLine(input: {
	tx: TransactionClient;
	salesOrderId: number;
	salesOrderItemId: number;
	line: Record<string, unknown>;
}) {
	const proposedHpt = record(input.line.housePackageTool);
	if (!Object.keys(proposedHpt).length) return;
	const hpt = await input.tx.housePackageTools.findUnique({
		where: { orderItemId: input.salesOrderItemId },
		select: { id: true, doorType: true },
	});
	if (!hpt) {
		throw new Error(
			`Approved adjustment line ${input.salesOrderItemId} is missing its house-package row.`,
		);
	}

	await input.tx.housePackageTools.update({
		where: { id: hpt.id },
		data: {
			totalDoors: Number(proposedHpt.totalDoors || input.line.qty || 0),
			totalPrice: Number(proposedHpt.totalPrice || input.line.lineTotal || 0),
		},
	});
	const existingDoors = await input.tx.dykeSalesDoors.findMany({
		where: { housePackageToolId: hpt.id, deletedAt: null },
		select: {
			id: true,
			dimension: true,
			stepProductId: true,
			meta: true,
		},
	});
	await input.tx.dykeSalesDoors.updateMany({
		where: { housePackageToolId: hpt.id, deletedAt: null },
		data: { activeIdentity: null },
	});
	const existingIds = new Set(existingDoors.map((door) => door.id));
	const existingByIdentity = new Map(
		existingDoors.map((door) => [getSalesDoorActiveIdentity(door), door.id]),
	);
	const retainedIds: number[] = [];
	const proposedDoors = Array.isArray(proposedHpt.doors)
		? proposedHpt.doors.map(record)
		: [];
	for (const door of proposedDoors) {
		const dimension = normalizeSalesDoorDimension(door.dimension);
		const totalQty = Math.round(
			Number(door.totalQty || 0) ||
				Number(door.lhQty || 0) + Number(door.rhQty || 0),
		);
		if (!dimension || totalQty <= 0) continue;
		const doorData = {
			housePackageToolId: hpt.id,
			salesOrderId: input.salesOrderId,
			salesOrderItemId: input.salesOrderItemId,
			dimension,
			swing: typeof door.swing === "string" ? door.swing : null,
			doorType:
				typeof door.doorType === "string" ? door.doorType : hpt.doorType,
			doorPrice: Number(door.doorPrice || 0),
			jambSizePrice: Number(door.jambSizePrice || 0),
			casingPrice: Number(door.casingPrice || 0),
			unitPrice: Number(door.unitPrice || 0),
			lhQty: Math.round(Number(door.lhQty || 0)),
			rhQty: Math.round(Number(door.rhQty || 0)),
			totalQty,
			lineTotal: Number(door.lineTotal || 0),
			stepProductId: Number(door.stepProductId || 0) || null,
			meta: record(door.meta),
			deletedAt: null,
		};
		const identity = getSalesDoorActiveIdentity(doorData);
		const requestedId = Number(door.id || 0);
		const existingId = existingIds.has(requestedId)
			? requestedId
			: Number(existingByIdentity.get(identity) || 0);
		const activeIdentity = `${hpt.id}|${identity}`;
		if (existingId > 0) {
			await input.tx.dykeSalesDoors.update({
				where: { id: existingId },
				data: { ...doorData, activeIdentity },
			});
			retainedIds.push(existingId);
		} else {
			const created = await input.tx.dykeSalesDoors.create({
				data: { ...doorData, activeIdentity },
				select: { id: true },
			});
			retainedIds.push(created.id);
		}
	}
	await input.tx.dykeSalesDoors.updateMany({
		where: {
			housePackageToolId: hpt.id,
			deletedAt: null,
			id: { notIn: retainedIds.length ? retainedIds : [0] },
		},
		data: { deletedAt: new Date(), activeIdentity: null },
	});
}

function adjustmentCompletionStatus(proposal: Record<string, unknown>) {
	return proposal.requiresOperationalAcknowledgement === true
		? ("APPLIED_WITH_REVIEW" as const)
		: ("APPLIED" as const);
}

function inboundDemandSnapshot(value: unknown) {
	return Array.isArray(value)
		? value.map(record).flatMap((row) => {
				const id = Number(row.id);
				return Number.isInteger(id)
					? [
							{
								id,
								qty: Number(row.qty || 0),
								qtyReceived: Number(row.qtyReceived || 0),
								status: String(row.status || "pending"),
								inboundShipmentItemId:
									row.inboundShipmentItemId == null
										? null
										: Number(row.inboundShipmentItemId),
								inboundId: row.inboundId == null ? null : Number(row.inboundId),
								inboundStatus:
									row.inboundStatus == null ? null : String(row.inboundStatus),
								inboundShipmentItemQty: Number(row.inboundShipmentItemQty || 0),
								inboundShipmentItemReceivedQty: Number(
									row.inboundShipmentItemReceivedQty || 0,
								),
							},
						]
					: [];
			})
		: [];
}

type InboundReconciliationResult = Awaited<
	ReturnType<typeof reconcileSalesAdjustmentInboundDemands>
>;

function storedInboundReconciliation(
	value: unknown,
): InboundReconciliationResult | null {
	const stored = record(value);
	if (!Array.isArray(stored.inboundEffects)) return null;
	return {
		adjustedDemandCount: Number(stored.adjustedDemandCount || 0),
		affectedInboundIds: Array.isArray(stored.affectedInboundIds)
			? stored.affectedInboundIds.map(Number).filter(Number.isInteger)
			: [],
		cancelledOpenQty: Number(stored.cancelledOpenQty || 0),
		keptWarehouseQty: Number(stored.keptWarehouseQty || 0),
		inboundEffects: stored.inboundEffects.map(record).flatMap((effect) => {
			const inboundId = Number(effect.inboundId);
			return Number.isInteger(inboundId)
				? [
						{
							inboundId,
							cancelledOpenQty: Number(effect.cancelledOpenQty || 0),
							keptWarehouseQty: Number(effect.keptWarehouseQty || 0),
						},
					]
				: [];
		}),
	};
}

async function recordInboundReconciliationActivities(input: {
	inboundEffects: Array<{
		inboundId: number;
		cancelledOpenQty: number;
		keptWarehouseQty: number;
	}>;
	adjustmentId: string;
	orderId: string;
	actorId: number;
	disposition: SalesAdjustmentInboundDisposition;
}) {
	if (!input.inboundEffects.length) return;
	let contact = await db.notePadContacts.findFirst({
		where: { profileId: input.actorId, role: "employee", deletedAt: null },
		select: { id: true },
	});
	if (!contact) {
		const actor = await db.users.findFirstOrThrow({
			where: { id: input.actorId, deletedAt: null },
			select: { id: true, name: true },
		});
		contact = await db.notePadContacts.create({
			data: { profileId: actor.id, role: "employee", name: actor.name },
			select: { id: true },
		});
	}

	for (const effect of input.inboundEffects) {
		const existing = await db.notePad.findFirst({
			where: {
				deletedAt: null,
				AND: [
					{
						tags: {
							some: {
								tagName: "adjustmentId",
								tagValue: input.adjustmentId,
							},
						},
					},
					{
						tags: {
							some: {
								tagName: "inboundId",
								tagValue: String(effect.inboundId),
							},
						},
					},
				],
			},
			select: { id: true },
		});
		if (existing) continue;
		await db.notePad.create({
			data: {
				subject:
					input.disposition === "CANCEL_OPEN_INBOUND"
						? "Inbound quantity cancelled by sale change"
						: "Inbound quantity retained for warehouse",
				headline: `Sale ${input.orderId} adjustment reconciled inbound #${effect.inboundId}.`,
				note:
					input.disposition === "CANCEL_OPEN_INBOUND"
						? `${effect.cancelledOpenQty} open inbound quantity was removed. Received evidence was preserved.`
						: `${effect.keptWarehouseQty} inbound quantity was retained for general warehouse stock.`,
				senderContactId: contact.id,
				tags: {
					createMany: {
						data: [
							{ tagName: "channel", tagValue: "inventory_inbound_activity" },
							{ tagName: "inboundId", tagValue: String(effect.inboundId) },
							{ tagName: "salesNo", tagValue: input.orderId },
							{ tagName: "type", tagValue: "system" },
							{ tagName: "status", tagValue: "public" },
							{ tagName: "adjustmentId", tagValue: input.adjustmentId },
						],
					},
				},
			},
		});
	}
}

export async function runApplySalesOrderAdjustment(
	payload: ApplySalesOrderAdjustmentPayload,
) {
	let claim = await db.salesOrderAdjustment.updateMany({
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
			select: { status: true, updatedAt: true },
		});
		const recovery = resolveSalesAdjustmentApplyRecovery(existing ?? {});
		if (
			recovery.action === "takeover" &&
			recovery.recoverAt &&
			existing?.updatedAt
		) {
			claim = await claimExpiredSalesAdjustmentApply(db.salesOrderAdjustment, {
				adjustmentId: payload.adjustmentId,
				observedUpdatedAt: existing.updatedAt,
			});
		}
		if (recovery.action === "schedule" && recovery.recoverAt && !claim.count) {
			await tasks.trigger("apply-sales-order-adjustment", payload, {
				delay: recovery.recoverAt,
			});
			return {
				adjustmentId: payload.adjustmentId,
				status: "APPLYING" as const,
				recoveryScheduled: true,
			};
		}
		if (claim.count) {
			// Continue below with an exclusive recovery lease.
		} else {
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
			const approvedProposal = record(adjustment.proposedSnapshot);
			const committedCheckpoint = getCommittedSalesAdjustmentCheckpoint(
				adjustment.commitmentSnapshot,
			);
			const status = adjustmentCompletionStatus(approvedProposal);
			const disposition = approvedProposal.inboundDisposition as
				| SalesAdjustmentInboundDisposition
				| undefined;
			const reconcileInbound = () =>
				disposition
					? reconcileSalesAdjustmentInboundDemands(tx, {
							adjustmentId: adjustment.id,
							disposition,
							lines: adjustment.lines.map((line) => {
								const commitment = record(line.commitmentSnapshot);
								return {
									beforeQty: Number(line.beforeQty),
									proposedQty: Number(line.proposedQty),
									inboundDemands: inboundDemandSnapshot(
										commitment.inboundDemands,
									),
								};
							}),
						})
					: Promise.resolve(null);
			if (committedCheckpoint) {
				const inboundReconciliation = storedInboundReconciliation(
					committedCheckpoint.inboundReconciliation,
				);
				if (disposition && !inboundReconciliation) {
					throw new Error(
						"Committed sales adjustment is missing its inbound reconciliation checkpoint.",
					);
				}
				return {
					stale: false,
					adjustment,
					status,
					disposition,
					inboundReconciliation,
					walletTransactionId: adjustment.walletTransactionId,
					refundSalesPaymentId: adjustment.refundSalesPaymentId,
				};
			}
			const liveVersion =
				typeof currentForm.version === "string" && currentForm.version
					? currentForm.version
					: `${adjustment.order.updatedAt?.getTime() || adjustment.order.createdAt?.getTime() || 0}-legacy`;
			const livePaymentTotal = projectLegacyOrderPayments({
				salesOrderId: adjustment.order.id,
				grandTotal: adjustment.order.grandTotal,
				payments: adjustment.order.payments,
			}).totalAllocated;
			const approvedCommitmentLines = adjustment.lines.map((line) =>
				record(line.commitmentSnapshot),
			);
			const quantityFloorChanged = adjustment.lines.some((line, index) => {
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
				const approvedMinimum = Number(
					approvedCommitmentLines[index]?.minimumAllowedQty || 0,
				);
				return Math.max(completedProductionQty, fulfilledQty) > approvedMinimum;
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
					disposition,
					inboundReconciliation: null,
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
				if (!proposedByUid.get(line.lineUid)) {
					throw new Error(
						`Adjustment line ${line.lineUid} is missing from its approved proposal.`,
					);
				}
			}
			const persistedItemIds = new Set(
				adjustment.order.items.map((item) => item.id),
			);
			const adjustedItemIds = new Set(
				adjustment.lines.map((line) => Number(line.salesOrderItemId || 0)),
			);
			for (const proposedLine of proposedLines) {
				const salesOrderItemId = Number(proposedLine.id || 0);
				if (!persistedItemIds.has(salesOrderItemId)) continue;
				const proposedHpt = record(proposedLine.housePackageTool);
				const hasDoorProjection =
					Array.isArray(proposedHpt.doors) && proposedHpt.doors.length > 0;
				if (!adjustedItemIds.has(salesOrderItemId) && !hasDoorProjection) {
					continue;
				}
				const groupedProjectionHandled = await projectApprovedGroupedSalesLine({
					tx,
					salesOrderId: adjustment.salesOrderId,
					line: proposedLine,
					persistedItemIds,
				});
				if (groupedProjectionHandled) continue;
				const proposedQty = Number(proposedLine.qty || 0);
				const proposedLineTotal = Number(proposedLine.lineTotal || 0);
				await tx.salesOrderItems.update({
					where: { id: salesOrderItemId },
					data: {
						qty: proposedQty,
						total: proposedLineTotal,
						deletedAt: proposedQty === 0 ? new Date() : null,
						rate: Number(proposedLine.unitPrice || 0),
						description: String(
							proposedLine.description || proposedLine.title || "Line item",
						),
					},
				});
				await projectApprovedShelfSalesLine({
					tx,
					salesOrderItemId,
					line: proposedLine,
				});
				await projectApprovedHousePackageLine({
					tx,
					salesOrderId: adjustment.salesOrderId,
					salesOrderItemId,
					line: proposedLine,
				});
			}

			const inboundReconciliation = await reconcileInbound();
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
					approvedAdjustmentInboundReconciliation: inboundReconciliation,
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
			await projectApprovedSalesTaxes({
				tx,
				salesOrderId: adjustment.salesOrderId,
				proposal: proposed,
				summary,
			});
			await prepareSalesDocumentReadiness(tx, {
				salesOrderId: adjustment.salesOrderId,
				forceEvaluate: true,
				stageProposal: true,
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

			await tx.salesOrderAdjustment.update({
				where: { id: adjustment.id },
				data: {
					walletTransactionId,
					refundSalesPaymentId,
					commitmentSnapshot: {
						...record(adjustment.commitmentSnapshot),
						applyCheckpoint: {
							stage: "COMMERCIAL_COMMITTED",
							inboundReconciliation,
						},
					},
				},
			});
			return {
				stale: false,
				adjustment,
				status,
				disposition,
				inboundReconciliation,
				walletTransactionId,
				refundSalesPaymentId,
			};
		});

		if (result.stale)
			return { adjustmentId: payload.adjustmentId, status: "STALE" as const };

		await runSalesInventoryProjectionSync(db, {
			salesOrderId: result.adjustment.salesOrderId,
			source: "adjustment",
			triggeredByUserId: result.adjustment.requestedById,
		});
		if (result.disposition && result.inboundReconciliation) {
			await recordInboundReconciliationActivities({
				inboundEffects: result.inboundReconciliation.inboundEffects,
				adjustmentId: result.adjustment.id,
				orderId: result.adjustment.order.orderId,
				actorId: result.adjustment.requestedById,
				disposition: result.disposition,
			});
		}
		await db.salesOrderAdjustment.update({
			where: { id: result.adjustment.id },
			data: {
				status: result.status,
				appliedAt: new Date(),
				walletTransactionId: result.walletTransactionId,
				refundSalesPaymentId: result.refundSalesPaymentId,
			},
		});
		if (result.adjustment.order.salesRepId) {
			await db.notifications
				.create({
					data: {
						type: "sales-order-adjustment",
						fromUserId: result.adjustment.requestedById,
						userId: result.adjustment.order.salesRepId,
						message:
							result.status === "APPLIED_WITH_REVIEW"
								? `Sale ${result.adjustment.order.orderId} was adjusted and needs operational review.`
								: `Sale ${result.adjustment.order.orderId} was adjusted with sales-representative approval.`,
						alert: true,
						link: `/sales/${result.adjustment.order.slug}`,
						meta: {
							adjustmentId: result.adjustment.id,
							inboundReconciliation: result.inboundReconciliation,
						},
					},
				})
				.catch((error) => {
					console.warn(
						"Failed to notify sales representative after adjustment",
						error,
					);
				});
		}
		await Promise.allSettled([
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
		const snapshotConflict =
			error instanceof SalesAdjustmentInboundSnapshotConflictError;
		await db.salesOrderAdjustment.updateMany({
			where: {
				id: payload.adjustmentId,
				status: "APPLYING",
			},
			data: {
				status: snapshotConflict ? "STALE" : "APPROVED",
				failureCode: snapshotConflict
					? "INBOUND_SNAPSHOT_CHANGED"
					: "APPLY_RETRY_REQUIRED",
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
