import { receiveInboundShipment } from "@gnd/inventory/inbound";

import { fulfillSalesInventoryNeedsManuallyInTransaction } from "../manual-fulfill-sales-inventory-needs";
import { autoReviewSalesPaymentsForOrderAction } from "../payment-system/application/payment-review";
import { resetSalesAction } from "../sales-control/actions";
import { getSalesSetting } from "../sales-control/settings";
import type { Db } from "../types";
import type { DecideProductionSubmissionMaterialReviewInput } from "./contracts";
import { parseItemScope } from "./queries";
import { evaluateProductionSubmissionMaterialEvidence } from "./service";

type ReviewDecisionActor = {
	id: number;
	name: string;
};

type ReviewDecisionDependencies = {
	evaluateEvidence?: typeof evaluateProductionSubmissionMaterialEvidence;
	manualFulfill?: typeof fulfillSalesInventoryNeedsManuallyInTransaction;
	receiveInbound?: typeof receiveInboundShipment;
	resetSales?: typeof resetSalesAction;
	onApproved?: (
		tx: Db,
		input: {
			salesOrderId: number;
			reviewId: number;
			actorId: number;
			submissions: Array<{
				id: number;
				qty: number;
				assignment: {
					assignedToId: number | null;
					laborCost: number | null;
					salesItemControlUid: string | null;
				} | null;
			}>;
		},
	) => Promise<void>;
};

function productionPayrollUid(salesOrderId: number, submissionId: number) {
	return `oid:${salesOrderId},submissionId:${submissionId}`;
}

export async function createProductionPayrollForSubmissions(
	tx: Db,
	input: {
		salesOrderId: number;
		submissions: Array<{
			id: number;
			qty: number;
			assignment: {
				assignedToId: number | null;
				laborCost: number | null;
				salesItemControlUid: string | null;
			} | null;
		}>;
	},
) {
	for (const submission of input.submissions) {
		const assignment = submission.assignment;
		if (!assignment?.assignedToId || !assignment.laborCost) continue;
		const amount =
			Math.round(assignment.laborCost * submission.qty * 100) / 100;
		await tx.payroll.upsert({
			where: {
				productionSubmissionId: submission.id,
			},
			create: {
				uid: productionPayrollUid(input.salesOrderId, submission.id),
				amount,
				type: "WAGE",
				status: "PENDING",
				orderId: input.salesOrderId,
				userId: assignment.assignedToId,
				itemUid: assignment.salesItemControlUid,
				productionSubmissionId: submission.id,
				history: {
					create: {
						status: "PENDING",
						note: "Created after production material approval",
						userId: assignment.assignedToId,
					},
				},
			},
			update: {
				amount,
				deletedAt: null,
			},
		});
	}
}

async function runApprovalCompletionEffects(
	tx: Db,
	input: {
		salesOrderId: number;
		reviewId: number;
		actorId: number;
		submissions: Array<{
			id: number;
			qty: number;
			assignment: {
				assignedToId: number | null;
				laborCost: number | null;
				salesItemControlUid: string | null;
			} | null;
		}>;
	},
) {
	await createProductionPayrollForSubmissions(tx, {
		salesOrderId: input.salesOrderId,
		submissions: input.submissions,
	});
	const paymentReviewSettings = (await getSalesSetting(tx)).data?.paymentReview;
	await autoReviewSalesPaymentsForOrderAction(tx, {
		salesId: input.salesOrderId,
		action: "production",
		settings: paymentReviewSettings ?? null,
		reviewedById: input.actorId,
		reviewNote: `Auto-reviewed after production material review #${input.reviewId} approval.`,
	});
}

function unresolvedComponentIds(materialSnapshot: unknown) {
	if (!Array.isArray(materialSnapshot)) return [];
	return Array.from(
		new Set(
			materialSnapshot.flatMap((material) => {
				if (
					!material ||
					typeof material !== "object" ||
					!Number.isInteger((material as any).componentId)
				) {
					return [];
				}
				const readiness = String((material as any).readiness || "");
				return readiness === "ready_for_production" || readiness === "fulfilled"
					? []
					: [(material as any).componentId as number];
			}),
		),
	);
}

async function assertReceiptBelongsToReview(
	tx: Db,
	receipt: NonNullable<
		DecideProductionSubmissionMaterialReviewInput["receipt"]
	>,
	componentIds: number[],
) {
	const itemIds =
		receipt.items?.map((item) => item.inboundShipmentItemId) || [];
	if (!itemIds.length || !componentIds.length) {
		throw new Error(
			"Select inbound receipt items linked to this production review.",
		);
	}
	const count = await tx.inboundShipmentItem.count({
		where: {
			id: { in: itemIds },
			inboundId: receipt.inboundId,
			deletedAt: null,
			inboundDemands: {
				some: {
					deletedAt: null,
					lineItemComponentId: { in: componentIds },
				},
			},
		},
	});
	if (count !== new Set(itemIds).size) {
		throw new Error(
			"One or more inbound receipt items are not linked to this production review.",
		);
	}
}

export async function decideProductionSubmissionMaterialReview(
	db: Db,
	input: DecideProductionSubmissionMaterialReviewInput,
	actor: ReviewDecisionActor,
	dependencies: ReviewDecisionDependencies = {},
) {
	const evaluateEvidence =
		dependencies.evaluateEvidence ??
		evaluateProductionSubmissionMaterialEvidence;
	const manualFulfill =
		dependencies.manualFulfill ??
		fulfillSalesInventoryNeedsManuallyInTransaction;
	const receiveInbound = dependencies.receiveInbound ?? receiveInboundShipment;
	const resetSales = dependencies.resetSales ?? resetSalesAction;
	const onApproved = dependencies.onApproved ?? runApprovalCompletionEffects;

	return db.$transaction(async (tx) => {
		const review =
			await tx.salesProductionSubmissionMaterialReview.findUniqueOrThrow({
				where: { id: input.reviewId },
				include: {
					order: {
						select: { id: true, orderId: true },
					},
					submissions: {
						where: { deletedAt: null },
						select: {
							id: true,
							qty: true,
							assignment: {
								select: {
									assignedToId: true,
									laborCost: true,
									salesItemControlUid: true,
								},
							},
						},
					},
				},
			});
		if (review.status !== "PENDING") {
			const approvingAction = input.action !== "REJECT";
			if (
				(review.status === "APPROVED" && approvingAction) ||
				(review.status === "REJECTED" && input.action === "REJECT")
			) {
				return {
					reviewId: review.id,
					status: review.status,
					materialRevision: review.materialRevision,
					idempotentReplay: true,
				};
			}
			throw new Error(
				`This production material review is already ${review.status.toLowerCase()}.`,
			);
		}
		if (review.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
			throw new Error(
				"This production material review changed. Refresh it before deciding.",
			);
		}
		if (!review.submissions.length) {
			throw new Error(
				"This production material review has no active submissions.",
			);
		}

		const itemScope = parseItemScope(review.assignmentScope);
		if (!itemScope.length) {
			throw new Error(
				"This production material review has no valid item scope.",
			);
		}

		if (input.action === "REJECT") {
			await tx.orderProductionSubmissions.updateMany({
				where: {
					id: {
						in: review.submissions.map((submission) => submission.id),
					},
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});
			const rejected =
				await tx.salesProductionSubmissionMaterialReview.updateMany({
					where: {
						id: review.id,
						status: "PENDING",
						updatedAt: input.expectedUpdatedAt,
					},
					data: {
						status: "REJECTED",
						reviewedById: actor.id,
						reviewedAt: new Date(),
						decisionNote: input.note,
						resolution: {
							action: input.action,
						},
					},
				});
			if (rejected.count !== 1) {
				throw new Error(
					"This production material review changed. Refresh it before deciding.",
				);
			}
			await resetSales(tx as Db, review.salesOrderId);
			await tx.salesHistory.create({
				data: {
					salesId: review.salesOrderId,
					name: "Production submission material review rejected",
					authorName: actor.name,
					data: {
						event: "production_submission_material_review_rejected",
						reviewId: review.id,
						reviewerId: actor.id,
						submissionIds: review.submissions.map(
							(submission) => submission.id,
						),
					},
				},
			});
			return {
				reviewId: review.id,
				status: "REJECTED" as const,
			};
		}

		const before = await evaluateEvidence(tx as Db, {
			salesOrderId: review.salesOrderId,
			itemScope,
		});
		const componentIds = unresolvedComponentIds(before.materialSnapshot);
		let resolution: Record<string, unknown> = {
			action: input.action,
			componentIds,
		};

		if (input.action === "MARK_AVAILABLE_AND_APPROVE") {
			if (!componentIds.length) {
				throw new Error(
					"No scoped inventory needs are available to mark fulfilled.",
				);
			}
			const result = await manualFulfill(
				tx as Db,
				{
					salesOrderId: review.salesOrderId,
					lineItemComponentIds: componentIds,
					authorName: actor.name,
					triggeredByUserId: actor.id,
				},
				{ writeHistory: false },
			);
			resolution = {
				...resolution,
				manualFulfillment: result,
			};
		}

		if (input.action === "RECEIVE_INBOUND_AND_APPROVE") {
			if (!input.receipt) {
				throw new Error("Inbound receipt details are required.");
			}
			await assertReceiptBelongsToReview(tx as Db, input.receipt, componentIds);
			const result = await receiveInbound(tx as Db, {
				...input.receipt,
				authorName: actor.name,
			});
			resolution = {
				...resolution,
				inboundReceipt: result,
			};
		}

		if (input.action === "RESOLVE_AND_APPROVE") {
			const receipts = input.resolutions?.receipts || [];
			const markAvailableComponentIds = Array.from(
				new Set(input.resolutions?.markAvailableComponentIds || []),
			);
			const invalidComponentIds = markAvailableComponentIds.filter(
				(componentId) => !componentIds.includes(componentId),
			);
			if (invalidComponentIds.length) {
				throw new Error(
					"One or more selected inventory needs are outside this production review.",
				);
			}
			const inboundReceipts: unknown[] = [];
			for (const receipt of receipts) {
				await assertReceiptBelongsToReview(tx as Db, receipt, componentIds);
				inboundReceipts.push(
					await receiveInbound(tx as Db, {
						...receipt,
						authorName: actor.name,
					}),
				);
			}
			const manualFulfillment = markAvailableComponentIds.length
				? await manualFulfill(
						tx as Db,
						{
							salesOrderId: review.salesOrderId,
							lineItemComponentIds: markAvailableComponentIds,
							authorName: actor.name,
							triggeredByUserId: actor.id,
						},
						{ writeHistory: false },
					)
				: null;
			resolution = {
				...resolution,
				inboundReceipts,
				manualFulfillment,
				noPhysicalStockChange: markAvailableComponentIds.length > 0,
			};
		}

		const after = await evaluateEvidence(tx as Db, {
			salesOrderId: review.salesOrderId,
			itemScope,
		});
		if (after.classification.state !== "finalized") {
			const refreshed =
				await tx.salesProductionSubmissionMaterialReview.updateMany({
					where: {
						id: review.id,
						status: "PENDING",
						updatedAt: input.expectedUpdatedAt,
					},
					data: {
						classificationReason: after.classification.reason,
						materialSnapshot: after.materialSnapshot,
						materialRevision: after.materialRevision,
						decisionNote: input.note,
						resolution: {
							...resolution,
							beforeRevision: before.materialRevision,
							afterRevision: after.materialRevision,
						},
					},
				});
			if (refreshed.count !== 1) {
				throw new Error(
					"This production material review changed. Refresh it before deciding.",
				);
			}
			return {
				reviewId: review.id,
				status: "PENDING" as const,
				materialRevision: after.materialRevision,
				reason: after.classification.reason,
				unresolvedMaterials: after.materialSnapshot,
			};
		}

		const approved =
			await tx.salesProductionSubmissionMaterialReview.updateMany({
				where: {
					id: review.id,
					status: "PENDING",
					updatedAt: input.expectedUpdatedAt,
				},
				data: {
					status: "APPROVED",
					reviewedById: actor.id,
					reviewedAt: new Date(),
					decisionNote: input.note,
					materialRevision: after.materialRevision,
					resolution: {
						...resolution,
						beforeRevision: before.materialRevision,
						afterRevision: after.materialRevision,
					},
				},
			});
		if (approved.count !== 1) {
			throw new Error(
				"This production material review changed. Refresh it before deciding.",
			);
		}
		await resetSales(tx as Db, review.salesOrderId);
		await onApproved(tx as Db, {
			salesOrderId: review.salesOrderId,
			reviewId: review.id,
			actorId: actor.id,
			submissions: review.submissions,
		});
		await tx.salesHistory.create({
			data: {
				salesId: review.salesOrderId,
				name: "Production submission material review approved",
				authorName: actor.name,
				data: {
					event: "production_submission_material_review_approved",
					reviewId: review.id,
					reviewerId: actor.id,
					submissionIds: review.submissions.map((submission) => submission.id),
					resolution,
				},
			},
		});
		return {
			reviewId: review.id,
			status: "APPROVED" as const,
			materialRevision: after.materialRevision,
		};
	});
}
