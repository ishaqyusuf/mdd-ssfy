"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { Notifications } from "@gnd/notifications";
import {
	classifyProductionMaterialReviewActionability,
	materialStatusFromStoredReview,
	submitProductionAssignment,
} from "@sales/production-submission-review";

import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { requireProductionSubmissionAuthority } from "./production-submission-authority";
import { actionClient } from "./safe-action";
import { createSubmissionSchema } from "./schema";

export const submitSalesAssignmentAction = actionClient
	.schema(createSubmissionSchema)
	.metadata({
		name: "submit-sales-assignment",
		track: {},
	})
	.action(async ({ parsedInput: input }) => {
		const actor = await getLoggedInProfile();
		if (!actor.userId) throw new Error("Authentication is required.");
		const representedOrder = await prisma.salesOrders.findFirst({
			where: { id: input.salesId, salesRepId: actor.userId },
			select: { id: true },
		});
		const authority = requireProductionSubmissionAuthority(actor, {
			isOrderSalesRep: Boolean(representedOrder),
		});
		if (!input.qty.qty) input.qty.qty = sum([input.qty.lh, input.qty.rh]);
		const result = await submitProductionAssignment(prisma as any, {
			salesOrderId: input.salesId,
			salesOrderItemId: input.itemId,
			assignmentId: input.assignmentId,
			submittedById: actor.userId,
			idempotencyKey:
				input.idempotencyKey ||
				`production:${input.salesId}:${input.assignmentId}:${actor.userId}`,
			qty: input.qty.qty,
			lhQty: input.qty.lh,
			rhQty: input.qty.rh,
			note: input.note,
			allowSubmitForOthers: authority.allowSubmitForOthers,
		});
		await reconcileSalesHandoffAfterCommit(prisma, {
			salesOrderIds: [input.salesId],
			actorUserId: actor.userId,
			source: "dashboard.production.submit-assignment",
		});
		if (!result.idempotentReplay) {
			try {
				const order = await prisma.salesOrders.findFirst({
					where: { id: input.salesId, deletedAt: null },
					select: { id: true, orderId: true, salesRepId: true },
				});
				if (order?.salesRepId) {
					await new Notifications(prisma).create(
						"sales_production_submitted",
						{
							salesId: order.id,
							orderNo: order.orderId || undefined,
							salesRepId: order.salesRepId,
							submittedById: actor.userId,
							submittedByName: actor.name || undefined,
							submittedQty: input.qty.qty,
							assignmentId: input.assignmentId,
						},
						{
							author: { id: actor.userId, role: "employee" },
							recipients: [{ ids: [order.salesRepId], role: "employee" }],
							includeChannelSubscribers: false,
							allowFallbackRecipient: false,
							forceInAppRecipients: true,
						},
					);
				}
			} catch (error) {
				console.warn(
					"Production submission was saved, but its sales rep notification failed.",
					{ error, submissionId: result.submissionId },
				);
			}
		}
		if (
			result.state === "pending_material_review" &&
			!result.idempotentReplay
		) {
			try {
				const review =
					await prisma.salesProductionSubmissionMaterialReview.findUnique({
						where: { id: result.reviewId },
						select: {
							id: true,
							classificationReason: true,
							materialSnapshot: true,
							materialRevision: true,
							order: {
								select: {
									id: true,
									orderId: true,
									salesRepId: true,
								},
							},
							submittedBy: {
								select: { id: true, name: true },
							},
							submissions: {
								where: { deletedAt: null },
								select: { qty: true },
							},
						},
					});
				if (review?.order.salesRepId) {
					const actionability = classifyProductionMaterialReviewActionability({
						reviewStatus: "PENDING",
						terminalOrder: false,
						activeSubmissionCount: review.submissions.length,
						superseded: false,
						materialStatus: materialStatusFromStoredReview(review),
					});
					const snapshot = Array.isArray(review.materialSnapshot)
						? review.materialSnapshot
						: [];
					const unresolvedMaterials = snapshot.filter((material) => {
						if (!material || typeof material !== "object") return false;
						const readiness = String(
							(material as { readiness?: unknown }).readiness || "",
						);
						return (
							readiness !== "ready_for_production" && readiness !== "fulfilled"
						);
					});
					const expectedAt =
						unresolvedMaterials
							.flatMap((material) => {
								const value = (material as { expectedAt?: unknown }).expectedAt;
								return typeof value === "string" ? [value] : [];
							})
							.sort()
							.at(-1) ?? null;
					await new Notifications(prisma).create(
						"sales_production_submission_material_review",
						{
							reviewId: review.id,
							salesId: review.order.id,
							orderNo: review.order.orderId || undefined,
							workerId: review.submittedBy.id,
							workerName: review.submittedBy.name || undefined,
							submittedQty: review.submissions.reduce(
								(total, submission) => total + submission.qty,
								0,
							),
							reason: review.classificationReason || "NOT_CONFIGURED",
							classification: actionability.classification,
							classificationVersion: actionability.version,
							evidenceRevision: review.materialRevision,
							pendingMaterialCount: unresolvedMaterials.length,
							expectedAt,
						},
						{
							author: { id: actor.userId, role: "employee" },
							recipients: [
								{
									ids: [review.order.salesRepId],
									role: "employee",
								},
							],
							includeChannelSubscribers: false,
							allowFallbackRecipient: false,
							forceInAppRecipients: true,
						},
					);
				}
			} catch (error) {
				console.warn(
					"Production submission was saved, but its material review notification failed.",
					{ error, reviewId: result.reviewId },
				);
			}
		}
		return result;
	});
