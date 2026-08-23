import { receiveInboundShipment } from "@gnd/inventory/inbound";

import { fulfillSalesInventoryNeedsManuallyInTransaction } from "../manual-fulfill-sales-inventory-needs";
import { autoReviewSalesPaymentsForOrderAction } from "../payment-system/application/payment-review";
import { resetSalesAction } from "../sales-control/actions";
import { getSalesSetting } from "../sales-control/settings";
import type { Db } from "../types";
import type { DecideProductionSubmissionMaterialReviewInput } from "./contracts";
import { parseItemScope } from "./queries";
import {
	evaluateProductionSubmissionMaterialEvidence,
	normalizeProductionSubmissionItemScope,
} from "./service";

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

type AssignmentScopeSnapshotMode = "legacy" | "modern" | "invalid";

function getAssignmentScopeSnapshotMode(
	value: unknown,
): AssignmentScopeSnapshotMode {
	if (!Array.isArray(value) || !value.length) return "invalid";
	const modes = value.map((item) => {
		if (!item || typeof item !== "object") return "invalid" as const;
		const row = item as Record<string, unknown>;
		if (
			typeof row.controlUid !== "string" ||
			!Number.isInteger(row.salesItemId) ||
			!Number.isInteger(row.assignmentId)
		) {
			return "invalid" as const;
		}
		const snapshotFields = [
			"assignedToId",
			"assignmentUpdatedAt",
			"laborCost",
		] as const;
		const present = snapshotFields.map((field) =>
			Object.prototype.hasOwnProperty.call(row, field),
		);
		if (present.every(Boolean)) return "modern" as const;
		if (present.every((fieldPresent) => !fieldPresent)) {
			return "legacy" as const;
		}
		return "invalid" as const;
	});
	if (modes.every((mode) => mode === "legacy")) return "legacy";
	if (modes.every((mode) => mode === "modern")) return "modern";
	return "invalid";
}

function validDateTimestamp(value: Date | null | undefined) {
	if (!(value instanceof Date)) return null;
	const timestamp = value.getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}

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
				const snapshot = material as {
					componentId?: unknown;
					readiness?: unknown;
				};
				if (
					!material ||
					typeof material !== "object" ||
					!Number.isInteger(snapshot.componentId)
				) {
					return [];
				}
				const readiness = String(snapshot.readiness || "");
				return readiness === "ready_for_production" || readiness === "fulfilled"
					? []
					: [snapshot.componentId as number];
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
							lhQty: true,
							rhQty: true,
							createdAt: true,
							salesOrderId: true,
							salesOrderItemId: true,
							assignmentId: true,
							materialReviewId: true,
							submittedById: true,
							assignment: {
								select: {
									id: true,
									orderId: true,
									itemId: true,
									assignedToId: true,
									laborCost: true,
									salesItemControlUid: true,
									qtyAssigned: true,
									lhQty: true,
									rhQty: true,
									deletedAt: true,
									updatedAt: true,
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

		let assignmentScope = normalizeProductionSubmissionItemScope(
			review.assignmentScope,
		);
		const scopeMode = getAssignmentScopeSnapshotMode(review.assignmentScope);
		const scopeAssignmentIds = assignmentScope.flatMap((scope) =>
			scope.assignmentId == null ? [] : [scope.assignmentId],
		);
		const staleReasons = [
			...(scopeMode === "invalid" ? ["review:assignment_scope_shape"] : []),
			...(assignmentScope.length !== review.submissions.length
				? ["review:assignment_scope_count"]
				: []),
			...(new Set(scopeAssignmentIds).size !== scopeAssignmentIds.length
				? ["review:assignment_scope_duplicate"]
				: []),
			...review.submissions.flatMap((submission) => {
				const assignment = submission.assignment;
				const snapshot = assignmentScope.find(
					(scope) => scope.assignmentId === submission.assignmentId,
				);
				if (
					!assignment ||
					!snapshot ||
					assignment.id !== submission.assignmentId
				) {
					return [`submission:${submission.id}:scope`];
				}
				const currentRevision = assignment.updatedAt?.toISOString() ?? null;
				const submittedAt = submission.createdAt;
				const currentRevisionTimestamp = validDateTimestamp(
					assignment.updatedAt,
				);
				const submittedAtTimestamp = validDateTimestamp(submittedAt);
				const qty = Number(submission.qty);
				const lhQty = Number(submission.lhQty || 0);
				const rhQty = Number(submission.rhQty || 0);
				const assignedQty = Number(assignment.qtyAssigned || 0);
				const assignedLhQty = Number(assignment.lhQty || 0);
				const assignedRhQty = Number(assignment.rhQty || 0);
				const currentControlUid =
					assignment.salesItemControlUid || `item-${assignment.itemId}`;
				return [
					review.submittedById !== submission.submittedById
						? `submission:${submission.id}:reporter`
						: null,
					submission.materialReviewId !== review.id
						? `submission:${submission.id}:review`
						: null,
					submission.salesOrderId !== review.salesOrderId
						? `submission:${submission.id}:order`
						: null,
					!Number.isFinite(qty) || qty <= 0 || qty > assignedQty
						? `submission:${submission.id}:qty`
						: null,
					!Number.isFinite(lhQty) || lhQty < 0 || lhQty > assignedLhQty
						? `submission:${submission.id}:lh_qty`
						: null,
					!Number.isFinite(rhQty) || rhQty < 0 || rhQty > assignedRhQty
						? `submission:${submission.id}:rh_qty`
						: null,
					assignment.deletedAt ? `assignment:${assignment.id}:deleted` : null,
					assignment.assignedToId == null
						? `assignment:${assignment.id}:unassigned`
						: null,
					assignment.orderId !== review.salesOrderId
						? `assignment:${assignment.id}:order`
						: null,
					assignment.itemId !== submission.salesOrderItemId ||
					snapshot.salesItemId !== submission.salesOrderItemId
						? `assignment:${assignment.id}:item`
						: null,
					snapshot.controlUid !== currentControlUid
						? `assignment:${assignment.id}:control`
						: null,
					scopeMode === "modern" &&
					(snapshot.assignedToId == null ||
						assignment.assignedToId !== snapshot.assignedToId)
						? `assignment:${assignment.id}:owner`
						: null,
					scopeMode === "modern" &&
					(!snapshot.assignmentUpdatedAt ||
						currentRevision !== snapshot.assignmentUpdatedAt)
						? `assignment:${assignment.id}:revision`
						: null,
					scopeMode === "legacy" &&
					(currentRevisionTimestamp == null || submittedAtTimestamp == null)
						? `assignment:${assignment.id}:legacy_revision_unverifiable`
						: null,
					scopeMode === "legacy" &&
					currentRevisionTimestamp != null &&
					submittedAtTimestamp != null &&
					currentRevisionTimestamp >= submittedAtTimestamp
						? `assignment:${assignment.id}:legacy_revision_not_strictly_before_submission`
						: null,
				].filter((reason): reason is string => Boolean(reason));
			}),
		];
		if (staleReasons.length) {
			const cancelled =
				await tx.salesProductionSubmissionMaterialReview.updateMany({
					where: {
						id: review.id,
						status: "PENDING",
						updatedAt: input.expectedUpdatedAt,
					},
					data: {
						status: "CANCELLED",
						reviewedById: actor.id,
						cancelledAt: new Date(),
						decisionNote:
							"The production report no longer matches its recorded assignment scope.",
						resolution: {
							action: "CANCEL_STALE_ASSIGNMENT_SCOPE",
							staleReasons,
						},
					},
				});
			if (cancelled.count !== 1) {
				throw new Error(
					"This production material review changed. Refresh it before deciding.",
				);
			}
			await resetSales(tx as Db, review.salesOrderId);
			await tx.salesHistory.create({
				data: {
					salesId: review.salesOrderId,
					name: "Production submission material review cancelled",
					authorName: actor.name,
					data: {
						event: "production_submission_material_review_scope_stale",
						reviewId: review.id,
						staleReasons,
					},
				},
			});
			return {
				reviewId: review.id,
				status: "CANCELLED" as const,
				staleAssignmentScope: true,
			};
		}
		let legacyAssignmentScopeBackfilled = false;
		if (scopeMode === "legacy") {
			const backfilledScope = assignmentScope.map((scope) => {
				const submission = review.submissions.find(
					(candidate) => candidate.assignmentId === scope.assignmentId,
				);
				return {
					...scope,
					assignedToId: submission?.assignment?.assignedToId ?? null,
					assignmentUpdatedAt:
						submission?.assignment?.updatedAt?.toISOString() ?? null,
					laborCost: submission?.assignment?.laborCost ?? null,
				};
			});
			const backfilled =
				await tx.salesProductionSubmissionMaterialReview.updateMany({
					where: {
						id: review.id,
						status: "PENDING",
						updatedAt: input.expectedUpdatedAt,
					},
					data: {
						assignmentScope: backfilledScope,
						updatedAt: input.expectedUpdatedAt,
					},
				});
			if (backfilled.count !== 1) {
				throw new Error(
					"This production material review changed. Refresh it before deciding.",
				);
			}
			assignmentScope = backfilledScope;
			legacyAssignmentScopeBackfilled = true;
		}

		const before = await evaluateEvidence(tx as Db, {
			salesOrderId: review.salesOrderId,
			itemScope,
		});
		const componentIds = unresolvedComponentIds(before.materialSnapshot);
		let resolution: Record<string, unknown> = {
			action: input.action,
			componentIds,
			...(legacyAssignmentScopeBackfilled
				? { legacyAssignmentScopeBackfilled: true }
				: {}),
		};
		if (input.action === "APPROVE_CONFIGURATION_EXCEPTION") {
			if (
				before.classification.state !== "pending_material_review" ||
				before.classification.reason !== "NOT_CONFIGURED"
			) {
				throw new Error(
					"A configuration exception can only approve an unconfigured production review.",
				);
			}
			resolution = {
				...resolution,
				configurationException: true,
				noPhysicalStockChange: true,
			};
		}

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
		const configurationExceptionApproved =
			input.action === "APPROVE_CONFIGURATION_EXCEPTION" &&
			after.classification.state === "pending_material_review" &&
			after.classification.reason === "NOT_CONFIGURED";
		if (
			after.classification.state !== "finalized" &&
			!configurationExceptionApproved
		) {
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
		const immutableSubmissions = review.submissions.map((submission) => {
			const scope = assignmentScope.find(
				(item) => item.assignmentId === submission.assignment?.id,
			);
			return {
				id: submission.id,
				qty: submission.qty,
				assignment: scope
					? {
							assignedToId: scope.assignedToId ?? null,
							laborCost: scope.laborCost ?? null,
							salesItemControlUid: scope.controlUid,
						}
					: null,
			};
		});
		await onApproved(tx as Db, {
			salesOrderId: review.salesOrderId,
			reviewId: review.id,
			actorId: actor.id,
			submissions: immutableSubmissions,
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
