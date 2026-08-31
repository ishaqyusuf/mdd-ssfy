import { createHash } from "node:crypto";

import type { Prisma } from "@gnd/db";
import { repairReceivedInboundNeedsForSalesOrder } from "@gnd/inventory/inbound";

import {
  type ProductionMaterialStatus,
  loadProductionMaterialStatuses,
} from "../production-v2/application/production-materials";
import type { Db } from "../types";
import {
  type ProductionSubmissionMaterialReviewReason,
  classifyProductionSubmissionMaterials,
} from "./policy";

export type ProductionSubmissionItemScope = {
  controlUid: string;
  salesItemId: number;
  assignmentId?: number | null;
  assignedToId?: number | null;
  assignmentUpdatedAt?: string | null;
  laborCost?: number | null;
};

type PrepareProductionSubmissionMaterialReviewInput = {
  salesOrderId: number;
  submittedById: number;
  idempotencyKey: string;
  itemScope: ProductionSubmissionItemScope[];
  approvedByAuthorizedOperator?: boolean;
};

type MaterialProjection = Awaited<
  ReturnType<typeof loadProductionMaterialStatuses>
>;

type ProductionSubmissionMaterialReviewDependencies = {
  repairReceivedInboundNeeds?: typeof repairReceivedInboundNeedsForSalesOrder;
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
  approvedByAuthorizedOperator?: boolean;
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

export function normalizeProductionSubmissionItemScope(itemScope: unknown) {
  if (!Array.isArray(itemScope)) return [];
  return itemScope
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (
        typeof row.controlUid !== "string" ||
        !Number.isInteger(row.salesItemId) ||
        (row.assignmentId != null && !Number.isInteger(row.assignmentId)) ||
        (row.assignedToId != null && !Number.isInteger(row.assignedToId)) ||
        (row.assignmentUpdatedAt != null &&
          typeof row.assignmentUpdatedAt !== "string") ||
        (row.laborCost != null &&
          (typeof row.laborCost !== "number" ||
            !Number.isFinite(row.laborCost)))
      ) {
        return [];
      }
      return [
        {
          controlUid: row.controlUid,
          salesItemId: row.salesItemId as number,
          assignmentId: (row.assignmentId as number | null | undefined) ?? null,
          assignedToId: (row.assignedToId as number | null | undefined) ?? null,
          assignmentUpdatedAt:
            (row.assignmentUpdatedAt as string | null | undefined) ?? null,
          laborCost: (row.laborCost as number | null | undefined) ?? null,
        },
      ];
    })
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
  const normalizedScope = normalizeProductionSubmissionItemScope(
    input.itemScope,
  );
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
      reviewedById: input.approvedByAuthorizedOperator
        ? input.submittedById
        : undefined,
      reviewedAt: input.status === "APPROVED" ? new Date() : undefined,
      resolution:
        input.status === "APPROVED"
          ? input.approvedByAuthorizedOperator
            ? {
                action: "AUTHORIZED_OPERATOR_APPROVED_ON_SUBMISSION",
                classificationReason: input.reason,
              }
            : { action: "AUTO_APPROVED_READY" }
          : undefined,
    },
    update: {},
    select: {
      id: true,
      salesOrderId: true,
      submittedById: true,
      assignmentScope: true,
      status: true,
      classificationReason: true,
      materialRevision: true,
    },
  });
  if (
    review.salesOrderId !== input.salesOrderId ||
    review.submittedById !== input.submittedById ||
    JSON.stringify(
      normalizeProductionSubmissionItemScope(review.assignmentScope),
    ) !== JSON.stringify(normalizedScope)
  ) {
    throw new Error(
      "Production submission idempotency key belongs to another request.",
    );
  }
  return {
    ...review,
  };
}

export async function refreshProductionSubmissionAssignmentScope(
  db: Db,
  reviewId: number,
) {
  const review = await db.salesProductionSubmissionMaterialReview.findUnique({
    where: { id: reviewId },
    select: {
      status: true,
      assignmentScope: true,
      submissions: {
        where: { deletedAt: null },
        select: {
          assignmentId: true,
          assignment: {
            select: {
              id: true,
              assignedToId: true,
              updatedAt: true,
              laborCost: true,
              salesItemControlUid: true,
              itemId: true,
            },
          },
        },
      },
    },
  });
  if (!review || review.status !== "PENDING") return;
  const assignmentById = new Map(
    review.submissions.flatMap((submission) =>
      submission.assignment
        ? [[submission.assignmentId, submission.assignment] as const]
        : [],
    ),
  );
  const refreshedScope = normalizeProductionSubmissionItemScope(
    review.assignmentScope,
  ).map((scope) => {
    const assignment = scope.assignmentId
      ? assignmentById.get(scope.assignmentId)
      : null;
    if (!assignment) return scope;
    return {
      ...scope,
      controlUid: assignment.salesItemControlUid || `item-${assignment.itemId}`,
      assignedToId: assignment.assignedToId,
      assignmentUpdatedAt: assignment.updatedAt?.toISOString() ?? null,
      laborCost: assignment.laborCost,
    };
  });
  await db.salesProductionSubmissionMaterialReview.updateMany({
    where: { id: reviewId, status: "PENDING" },
    data: { assignmentScope: refreshedScope },
  });
}

export async function prepareProductionSubmissionMaterialReview(
  db: Db,
  input: PrepareProductionSubmissionMaterialReviewInput,
  dependencies: ProductionSubmissionMaterialReviewDependencies = {},
) {
  await (
    dependencies.repairReceivedInboundNeeds ??
    repairReceivedInboundNeedsForSalesOrder
  )(db, {
    salesOrderId: input.salesOrderId,
    actorUserId: input.submittedById,
  });
  const evidence = await evaluateProductionSubmissionMaterialEvidence(
    db,
    input,
    dependencies,
  );
  const { classification, materialSnapshot, materialRevision } = evidence;
  const review = await createPendingMaterialReview(db, {
    ...input,
    materialSnapshot,
    materialRevision,
    reason: classification.reason,
    status:
      classification.state === "finalized" ||
      input.approvedByAuthorizedOperator
        ? "APPROVED"
        : "PENDING",
  });
  if (review.status === "REJECTED" || review.status === "CANCELLED") {
    throw new Error(
      "Production submission idempotency key belongs to a closed review. Start a new submission.",
    );
  }
  return {
    state:
      review.status === "APPROVED"
        ? ("finalized" as const)
        : ("pending_material_review" as const),
    reason:
      review.status === "APPROVED"
        ? null
        : (review.classificationReason ?? classification.reason),
    reviewId: review.id,
    materialRevision: review.materialRevision,
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
  const missingSalesItemIds =
    projection.state === "available"
      ? Array.from(scopedSalesItemIds).filter(
          (salesItemId) => !materialSalesItemIds.has(salesItemId),
        )
      : [];
  const classification =
    projection.state === "unavailable"
      ? classifyProductionSubmissionMaterials({
          state: projection.state,
          materials: [],
        })
      : missingSalesItemIds.length
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
