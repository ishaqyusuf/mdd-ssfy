import { createHash } from "node:crypto";

import type { Prisma } from "@gnd/db";

import type { Db } from "../types";
import {
	loadProductionMaterialStatuses,
	type ProductionMaterialStatus,
} from "../production-v2/application/production-materials";
import {
	classifyProductionSubmissionMaterials,
	type ProductionSubmissionMaterialReviewReason,
	shouldBlockProductionWorkerSubmission,
} from "./policy";

export type ProductionSubmissionItemScope = {
	controlUid: string;
	salesItemId: number;
	assignmentId?: number | null;
};

type PrepareProductionSubmissionMaterialReviewInput = {
	salesOrderId: number;
	submittedById: number;
	idempotencyKey: string;
	itemScope: ProductionSubmissionItemScope[];
	enforceMaterialAvailability?: boolean;
};

type MaterialProjection = Awaited<
	ReturnType<typeof loadProductionMaterialStatuses>
>;

type ProductionSubmissionMaterialReviewDependencies = {
	loadMaterials?: (
		db: Db,
		input: {
			salesOrderId: number;
			completeOrder: true;
		},
	) => Promise<MaterialProjection>;
};

export type ProductionSubmissionMaterialEvidence = {
	classification: ReturnType<typeof classifyProductionSubmissionMaterials>;
	materialSnapshot: Prisma.InputJsonArray;
	materialRevision: string | null;
};

type CreatePendingMaterialReviewInput = {
	salesOrderId: number;
	submittedById: number;
	idempotencyKey: string;
	itemScope: ProductionSubmissionItemScope[];
	materialSnapshot: Prisma.InputJsonArray;
	materialRevision: string | null;
	reason: ProductionSubmissionMaterialReviewReason | null;
	status?: "PENDING" | "APPROVED";
};

function normalizeDate(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function snapshotMaterial(material: ProductionMaterialStatus) {
	return {
		salesOrderId: material.salesOrderId,
		salesItemId: material.salesItemId,
		componentId: material.componentId,
		name: material.name,
		readiness: material.readiness,
		stockStatus: material.stockStatus,
		requiredQty: material.requiredQty,
		availableQty: material.availableQty,
		openInboundQty: material.openInboundQty,
		expectedAt: normalizeDate(material.expectedAt),
		undatedOpenInboundQty: material.undatedOpenInboundQty,
	};
}

function buildMaterialRevision(
	state: MaterialProjection["state"],
	materials: Prisma.InputJsonArray,
) {
	if (state === "unavailable") return null;
	return createHash("sha256").update(JSON.stringify(materials)).digest("hex");
}

function normalizeItemScope(itemScope: ProductionSubmissionItemScope[]) {
	return [...itemScope]
		.map((item) => ({
			controlUid: item.controlUid,
			salesItemId: item.salesItemId,
			assignmentId: item.assignmentId ?? null,
		}))
		.sort(
			(left, right) =>
				left.salesItemId - right.salesItemId ||
				(left.assignmentId ?? 0) - (right.assignmentId ?? 0) ||
				left.controlUid.localeCompare(right.controlUid),
		);
}

export async function createPendingMaterialReview(
	db: Db,
	input: CreatePendingMaterialReviewInput,
) {
	const normalizedScope = normalizeItemScope(input.itemScope);
	const review = await db.salesProductionSubmissionMaterialReview.upsert({
		where: {
			idempotencyKey: input.idempotencyKey,
		},
		create: {
			salesOrderId: input.salesOrderId,
			submittedById: input.submittedById,
			status: input.status ?? "PENDING",
			classificationReason: input.reason,
			idempotencyKey: input.idempotencyKey,
			assignmentScope: normalizedScope,
			materialSnapshot: input.materialSnapshot,
			materialRevision: input.materialRevision,
			reviewedAt: input.status === "APPROVED" ? new Date() : undefined,
			resolution:
				input.status === "APPROVED"
					? { action: "AUTO_APPROVED_READY" }
					: undefined,
		},
		update: {},
		select: {
			id: true,
			salesOrderId: true,
			submittedById: true,
			assignmentScope: true,
		},
	});
	if (
		review.salesOrderId !== input.salesOrderId ||
		review.submittedById !== input.submittedById ||
		JSON.stringify(normalizeItemScope(review.assignmentScope as any)) !==
			JSON.stringify(normalizedScope)
	) {
		throw new Error(
			"Production submission idempotency key belongs to another request.",
		);
	}
	return {
		...review,
	};
}

export async function prepareProductionSubmissionMaterialReview(
	db: Db,
	input: PrepareProductionSubmissionMaterialReviewInput,
	dependencies: ProductionSubmissionMaterialReviewDependencies = {},
) {
	const evidence = await evaluateProductionSubmissionMaterialEvidence(
		db,
		input,
		dependencies,
	);
	const { classification, materialSnapshot, materialRevision } = evidence;
	if (
		input.enforceMaterialAvailability &&
		shouldBlockProductionWorkerSubmission(classification)
	) {
		throw new Error(
			classification.reason === "PROJECTION_UNAVAILABLE"
				? "Material availability could not be verified. Try again before submitting production."
				: "Required materials are unavailable. Production submission is blocked until inventory is ready.",
		);
	}

	const review = await createPendingMaterialReview(db, {
		...input,
		materialSnapshot,
		materialRevision,
		reason: classification.reason,
		status: classification.state === "finalized" ? "APPROVED" : "PENDING",
	});
	return {
		...classification,
		reviewId: review.id,
		materialRevision,
	};
}

export async function evaluateProductionSubmissionMaterialEvidence(
	db: Db,
	input: Pick<
		PrepareProductionSubmissionMaterialReviewInput,
		"salesOrderId" | "itemScope"
	>,
	dependencies: ProductionSubmissionMaterialReviewDependencies = {},
): Promise<ProductionSubmissionMaterialEvidence> {
	const projection = await (
		dependencies.loadMaterials ?? loadProductionMaterialStatuses
	)(db, {
		salesOrderId: input.salesOrderId,
		completeOrder: true,
	});
	const scopedSalesItemIds = new Set(
		input.itemScope.map((item) => item.salesItemId),
	);
	const scopedMaterials = projection.materials.filter(
		(material) =>
			material.salesItemId != null &&
			scopedSalesItemIds.has(material.salesItemId),
	);
	const materialSalesItemIds = new Set(
		scopedMaterials.flatMap((material) =>
			material.salesItemId == null ? [] : [material.salesItemId],
		),
	);
	const missingSalesItemIds = Array.from(scopedSalesItemIds).filter(
		(salesItemId) => !materialSalesItemIds.has(salesItemId),
	);
	const classification = missingSalesItemIds.length
		? ({
				state: "pending_material_review",
				reason: "NOT_CONFIGURED",
			} as const)
		: classifyProductionSubmissionMaterials({
				state: projection.state,
				materials: scopedMaterials,
			});
	const materialSnapshot = [
		...scopedMaterials.map(snapshotMaterial),
		...missingSalesItemIds.map((salesItemId) => ({
			salesOrderId: input.salesOrderId,
			salesItemId,
			componentId: null,
			name: "Material configuration missing",
			readiness: "not_configured",
			stockStatus: null,
			requiredQty: 0,
			availableQty: 0,
			openInboundQty: 0,
			expectedAt: null,
			undatedOpenInboundQty: 0,
		})),
	].sort((left, right) =>
		JSON.stringify(left).localeCompare(JSON.stringify(right)),
	);
	const materialRevision = buildMaterialRevision(
		projection.state,
		materialSnapshot as Prisma.InputJsonArray,
	);

	return {
		classification,
		materialSnapshot: materialSnapshot as Prisma.InputJsonArray,
		materialRevision,
	};
}
