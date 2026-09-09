import { createHash } from "node:crypto";
import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { DB_TRANSACTION_PROFILES } from "@gnd/db/transactions";
import { AppError } from "@gnd/errors";
import { z } from "zod";
import {
	getProductionAvailability,
	type ProductionAvailabilityActor,
} from "./production-availability-query";
import { scopeFor } from "./production-inbound";
import {
	reconcileProductionInboundReviews,
	reviewTouchesReceivedComponents,
} from "./production-inbound-review";
import {
	productionMaterialReviewScopeSubmissionSelect,
	validateProductionMaterialReviewAssignmentScope,
} from "./production-submission-review/assignment-scope";
import { parseItemScope } from "./production-submission-review/queries";
import { evaluateProductionSubmissionMaterialEvidence } from "./production-submission-review/service";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";
import { refreshSalesOrderListProjections } from "./order-list-projection-builder";
import { applyScopedReceivedNeedsPlan } from "@gnd/inventory";
import { planReceivedMaterialReservations, applyReceivedMaterialReservations } from "./sales-fulfillment-plan";
import {
	getProductionInboundAllocationCoverage,
	confirmProductionInboundAllocations,
	validateProductionAllocationCoverage,
} from "./production-inbound-allocation";
import { planProductionAllocationRepairs, applyProductionAllocationRepairs, verifyProductionAllocationRepairs } from "./production-sync-allocation-repairs";
import { getProductionClassificationRepairs, applyProductionClassificationRepairs } from "./production-sync-classification";
import { getReviewScopeRefreshes, applyReviewScopeRefreshes } from "./production-sync-review-scope";

type Client = Db | TransactionClient;
export type CoveredProductionMaterialsActor = ProductionAvailabilityActor & {
	canReconcileMaterials: boolean;
};
export const applyCoveredProductionMaterialsSchema = z.object({
	salesOrderId: z.number().int().positive(),
	expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
	idempotencyKey: z.string().uuid(),
});
const resultSchema = z.object({
	salesOrderId: z.number(),
	resolvedCount: z.number(),
	remainingReviewCount: z.number(),
	appliedAllocationCount: z.number().default(0),
	appliedReceivedQty: z.number().default(0),
	appliedDemandCount: z.number().default(0),
	repairedAllocationCount: z.number().default(0),
	repairedClassificationCount: z.number().default(0),
	refreshedReviewCount: z.number().default(0),
	remainingMaterialQty: z.number().nullable().default(null),
	remainingAllocationBlockCount: z.number().nullable().default(null),
});
const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
function conflict(message: string): never {
	throw new AppError({ code: "CONFLICT", publicMessage: message });
}

/** Read-only preflight. Opening Production/calendar never approves submissions. */
export async function getCoveredProductionMaterials(
	db: Client,
	salesOrderId: number,
	actor: CoveredProductionMaterialsActor,
) {
	const scope = await scopeFor(db, salesOrderId, actor);
	const assignments = new Set(
		scope.assignments.map((assignment) => assignment.id),
	);
	const reviews = await db.salesProductionSubmissionMaterialReview.findMany({
		where: {
			salesOrderId,
			status: "PENDING",
			...(!actor.canViewAll
				? {
						submissions: {
							some: { deletedAt: null, assignmentId: { in: [...assignments] } },
						},
					}
				: {}),
		},
		orderBy: { id: "asc" },
		take: 101,
		include: {
			submissions: {
				where: { deletedAt: null },
				select: productionMaterialReviewScopeSubmissionSelect,
			},
		},
	});
	const available = await getProductionAvailability(db, salesOrderId, actor);
	const reviewScopePlan = await getReviewScopeRefreshes(db, reviews.slice(0, 100));
	const canRefreshReviews = actor.canViewAll && actor.canReconcileMaterials;
	let allocationEvidence: Awaited<
		ReturnType<typeof getProductionInboundAllocationCoverage>
	> | null = null;
	let allocationBlocked = false;
	try {
		allocationEvidence = await getProductionInboundAllocationCoverage(
			db,
			scope.componentIds,
			true,
		);
		allocationBlocked = allocationEvidence.blockedComponentIds.length > 0;
	} catch (error) {
		if (!(error instanceof AppError)) throw error;
		allocationBlocked = true;
	}
	const canApplyAllocations = actor.canViewAll
		? actor.canEditInbound || actor.canMarkAvailable
		: scope.policy.workerCanReceiveInbound;
	const applicableAllocationCount = allocationEvidence?.ids.length ?? 0;
	const classificationPlan = await getProductionClassificationRepairs(db, salesOrderId, scope.componentIds);
	const canRepairClassification = actor.canViewAll && actor.canReconcileMaterials;
	const allocationCandidates = allocationEvidence ? planProductionAllocationRepairs(allocationEvidence.components, allocationEvidence.blockedComponentIds, available.receivedNeeds) : [];
	const pendingAllocations = allocationEvidence?.components.flatMap(component => component.stockAllocations.filter(allocation => allocationEvidence!.ids.includes(allocation.id))) ?? [];
	const receivedPlan = await planReceivedMaterialReservations(db, available.receivedNeeds.filter(need => !allocationEvidence?.blockedComponentIds.includes(need.componentId)).map(need => {
		const component = allocationEvidence?.components.find(component=>component.id===need.componentId);
		const pendingQty = component?.stockAllocations.filter(allocation=>allocation.status==="pending_review").reduce((sum,allocation)=>sum+allocation.qty,0) ?? 0;
		return {...need,qty:Math.max(0,need.qty-pendingQty)};
	}).concat(allocationCandidates.filter(row => row.qty > 0).map(row => ({ componentId: row.componentId, inventoryVariantId: row.inventoryVariantId, qty: row.qty, requireFullCoverage: true }))), pendingAllocations);
	const allocationRepairs = allocationCandidates.filter(candidate => candidate.qty === 0 || receivedPlan.rows.some(row => row.componentId === candidate.componentId && row.qty + 0.000001 >= candidate.qty));
	const repairableAllocationCount = allocationRepairs.reduce((sum, row) => sum + row.allocationIds.length, 0);
	const repairableClassificationCount = canRepairClassification ? classificationPlan.rows.length : 0;
	const blockers = [...classificationPlan.blocked.map(row => row.message)];
	if (!canRepairClassification && classificationPlan.rows.length) blockers.push("A production supervisor must synchronize the inventory production classification.");
	for (const component of allocationEvidence?.components ?? []) {
		if (!allocationEvidence?.blockedComponentIds.includes(component.id) || allocationRepairs.some(row => row.componentId === component.id)) continue;
		const name = available.needs.find(need => need.componentIds.includes(component.id));
		try { validateProductionAllocationCoverage([component], allocationEvidence.stocks, allocationEvidence.committed); }
		catch (error) {
			if (!(error instanceof AppError)) throw error;
			blockers.push(`${name ? [name.name, name.description].filter(Boolean).join(" • ") : "Material need"}: ${error.message}`);
		}
	}
	const applicableReceivedQty = receivedPlan.rows.reduce((sum,row)=>sum+row.qty,0);
	const applicableComponentIds =
		allocationEvidence?.components
			.filter((component) =>
				component.stockAllocations.some((allocation) =>
					allocationEvidence!.ids.includes(allocation.id),
				),
			)
			.map((component) => component.id) ?? [];
	const candidates: Array<{
		id: number;
		materialRevision: string | null;
		eligible: boolean;
	}> = [];
	for (const review of reviews.slice(0, 100)) {
		const reviewScope = parseItemScope(review.assignmentScope);
		const validated = validateProductionMaterialReviewAssignmentScope(review);
		const scopeRefresh = canRefreshReviews ? reviewScopePlan.rows.find(row => row.reviewId === review.id) : null;
		const allowed =
			reviewTouchesReceivedComponents(
				review.materialSnapshot,
				scope.componentIds,
			) &&
			reviewScope.length > 0 &&
			review.submissions.length > 0 &&
			(!validated.staleReasons.length || !!scopeRefresh) &&
			(actor.canViewAll ||
				reviewScope.every(
					(item) => item.assignmentId && assignments.has(item.assignmentId),
				));
		if (!allowed) {
			blockers.push(`Submission review #${review.id}: assignment details or review evidence changed. A production supervisor must check the worker, quantities and labor rate.`);
			candidates.push({ id: review.id, materialRevision: "", eligible: false });
			continue;
		}
		const evidence = await evaluateProductionSubmissionMaterialEvidence(
			db as Db,
			{ salesOrderId, itemScope: reviewScope },
		);
		candidates.push({
			id: review.id,
			materialRevision: evidence.materialRevision,
			eligible: evidence.classification.state === "finalized",
		});
	}
	const authority = actor.canViewAll
		? actor.canReconcileMaterials
		: scope.policy.workerCanReceiveInbound;
	const eligibleReviewCount = candidates.filter(
		(review) => review.eligible,
	).length;
	// Refresh only reviews whose materials are ready now, or become ready through
	// the same repair transaction. Eligibility is recalculated after all repairs.
	const repairableReviewCount = canRefreshReviews ? reviewScopePlan.rows.filter(row => candidates.some(candidate => candidate.id === row.reviewId && candidate.eligible)).length : 0;
	return {
		salesOrderId,
		eligibleReviewCount,
		eligibleReviewIds: candidates.filter(row => row.eligible).map(row => row.id),
		applicableAllocationCount,
		applicableReceivedQty,
		applicableDemandCount:available.unappliedInboundNeeds.rows.length,
		unappliedInboundNeeds:available.unappliedInboundNeeds,
		receivedPlan,
		allocationRepairs,
		classificationPlan,
		reviewScopePlan,
		repairableReviewCount,
		repairableAllocationCount,
		repairableClassificationCount,
		blockers,
		canSynchronize: authority,
		applicableComponentIds,
		allocationBlocked,
		pendingMaterialQty: available.pendingQty,
		blockedAllocationComponentCount: allocationEvidence?.blockedComponentIds.length ?? 0,
		canApplyAllocations,
		pendingReviewCount: reviews.length,
		blockedReviewCount: reviews.length - eligibleReviewCount,
		workerMode: !actor.canViewAll,
		canApply:
			authority &&
			reviews.length <= 100 &&
			(eligibleReviewCount > 0 || repairableClassificationCount > 0 || (canApplyAllocations && repairableAllocationCount > 0) ||
				(canApplyAllocations && (applicableAllocationCount > 0 || applicableReceivedQty > 0 || available.unappliedInboundNeeds.rows.length > 0))) &&
			!["readonly", "unknown"].includes(available.state),
		revision: hash({
			availability: available.revision,
			reviews,
			candidates,
			authority,
			allocationEvidence,
			receivedPlan,
			canApplyAllocations,
			classificationPlan,
			reviewScopePlan,
			canRefreshReviews,
			canRepairClassification,
			allocationRepairs,
		}),
	};
}

/** Finalizes already-covered reviews using the established receipt reconciliation
 * rules. This operation never creates an inbound or receives physical stock. */
export async function applyCoveredProductionMaterials(
	db: Db,
	raw: z.infer<typeof applyCoveredProductionMaterialsSchema>,
	resolveActor: (
		tx: TransactionClient,
	) => Promise<CoveredProductionMaterialsActor>,
) {
	const input = applyCoveredProductionMaterialsSchema.parse(raw),
		requestHash = hash(input);
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM SalesOrders WHERE id=${input.salesOrderId} FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM Settings WHERE type='sales-settings' AND deletedAt IS NULL FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM OrderItemProductionAssignments WHERE orderId=${input.salesOrderId} ORDER BY id FOR UPDATE`,
			);
			const actor = await resolveActor(tx);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM Users WHERE id=${actor.id} FOR UPDATE`,
			);
			const scope = await scopeFor(tx, input.salesOrderId, actor);
			if (
				!(actor.canViewAll
					? actor.canReconcileMaterials
					: scope.policy.workerCanReceiveInbound)
			)
				throw new AppError({
					code: "PERMISSION_DENIED",
					publicMessage: "You cannot apply covered production materials.",
				});
			const prior = await tx.event.findFirst({
				where: {
					type: "production_covered_materials_applied",
					userId: actor.id,
					data: { path: "$.idempotencyKey", equals: input.idempotencyKey },
				},
				select: { data: true },
			});
			if (prior) {
				const audit = prior.data as { requestHash: string; result: unknown };
				if (audit.requestHash !== requestHash)
					conflict(
						"This material application was already used with different details.",
					);
				return { ...resultSchema.parse(audit.result), replayed: true };
			}
			await tx.$queryRaw(
				Prisma.sql`SELECT c.id FROM LineItemComponents c JOIN LineItem l ON l.id=c.lineItemId WHERE l.saleId=${input.salesOrderId} ORDER BY c.id FOR UPDATE`,
			);
			const preview = await getCoveredProductionMaterials(
				tx,
				input.salesOrderId,
				actor,
			);
			if (preview.revision !== input.expectedRevision)
				conflict(
					"Materials or production reviews changed. Refresh and try again.",
				);
			if (!preview.canApply)
				conflict("No covered production reviews are ready to apply.");
			const classificationRepairs = actor.canViewAll && actor.canReconcileMaterials ? preview.classificationPlan.rows : [];
			const allocationRepairs = preview.canApplyAllocations ? preview.allocationRepairs : [];
			await applyProductionClassificationRepairs(tx, classificationRepairs);
			await applyProductionAllocationRepairs(tx, allocationRepairs);
			const repaired = classificationRepairs.length || allocationRepairs.length
				? await getCoveredProductionMaterials(tx, input.salesOrderId, actor) : preview;
			const appliedDemandRows = repaired.canApplyAllocations ? await applyScopedReceivedNeedsPlan(tx,repaired.unappliedInboundNeeds) : [];
			const appliedAllocationIds =
				repaired.canApplyAllocations && repaired.applicableAllocationCount > 0
					? await confirmProductionInboundAllocations(
							tx,
							repaired.applicableComponentIds,
							"Physical stock verified through Apply covered materials.",
						)
					: [];
			if (
				repaired.canApplyAllocations &&
				appliedAllocationIds.length !== repaired.applicableAllocationCount
			)
				conflict("Allocation evidence changed. Refresh and try again.");
			const beforeReservation = appliedAllocationIds.length || appliedDemandRows.length
				? await getCoveredProductionMaterials(tx, input.salesOrderId, actor)
				: repaired;
			const receiptAllocations = preview.canApplyAllocations ? await applyReceivedMaterialReservations(tx, beforeReservation.receivedPlan.rows) : [];
			let effective = receiptAllocations.length ? await getCoveredProductionMaterials(tx,input.salesOrderId,actor) : beforeReservation;
			await verifyProductionAllocationRepairs(tx, allocationRepairs);
			const reviewScopeRefreshes = actor.canViewAll && actor.canReconcileMaterials
				? effective.reviewScopePlan.rows.filter(row => effective.eligibleReviewIds.includes(row.reviewId)) : [];
			await applyReviewScopeRefreshes(tx, reviewScopeRefreshes);
			if (reviewScopeRefreshes.length) effective = await getCoveredProductionMaterials(tx, input.salesOrderId, actor);
			const applied = await reconcileProductionInboundReviews(tx, {
				salesOrderId: input.salesOrderId,
				componentIds: scope.componentIds,
				actorId: actor.id,
				authorizedAssignmentIds: actor.canViewAll
					? null
					: [...scope.assignments.map((assignment) => assignment.id)],
			});
			if (applied.approvedReviewIds.length !== effective.eligibleReviewCount)
				conflict(
					"Production review eligibility changed. Refresh and try again.",
				);
			const result = {
				salesOrderId: input.salesOrderId,
				resolvedCount: applied.approvedReviewIds.length,
				appliedAllocationCount: appliedAllocationIds.length,
				appliedReceivedQty: receiptAllocations.reduce((sum,row)=>sum+row.qty,0),
				appliedDemandCount:appliedDemandRows.length,
				repairedAllocationCount: allocationRepairs.reduce((sum, row) => sum + row.allocationIds.length, 0),
				repairedClassificationCount: classificationRepairs.length,
				refreshedReviewCount: reviewScopeRefreshes.length,
				remainingMaterialQty:effective.pendingMaterialQty,
				remainingAllocationBlockCount:effective.blockedAllocationComponentCount,
				remainingReviewCount:
					preview.pendingReviewCount - applied.approvedReviewIds.length,
			};
			await tx.event.create({
				data: {
					type: "production_covered_materials_applied",
					userId: actor.id,
					data: {
						version: 1,
						salesOrderId: input.salesOrderId,
						idempotencyKey: input.idempotencyKey,
						requestHash,
						result,
						reviewIds: applied.approvedReviewIds,
						allocationIds: appliedAllocationIds,
						allocationReceipts: receiptAllocations,
						demandApplications:appliedDemandRows,
						allocationRepairs,
						reviewScopeRefreshes,
						classificationRepairs: classificationRepairs.map(row => ({ lineItemId: row.id, before: row.meta, salesItemId: row.salesItem!.id, rule: "canonical-sales-production-eligibility" })),
					},
				},
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					authorName: String(actor.id),
					name: "Covered production materials applied",
					data: result,
				},
			});
			const pipeline = (
				await getSalesPipelineSnapshots(tx as Db, [input.salesOrderId])
			).get(input.salesOrderId);
			if (!pipeline?.freshness.evidenceUpdatedAt)
				conflict(
					"Production evidence could not be refreshed. Nothing was applied.",
				);
			const projection = await refreshSalesOrderListProjections(tx as Db, [
				{
					salesOrderId: input.salesOrderId,
					sourceUpdatedAt: new Date(pipeline.freshness.evidenceUpdatedAt),
				},
			]);
			if (projection.persisted !== 1)
				conflict("Production evidence changed during refresh. Try again.");
			return { ...result, replayed: false };
		},
		{ ...DB_TRANSACTION_PROFILES.workflow, isolationLevel: "Serializable" },
	);
}
