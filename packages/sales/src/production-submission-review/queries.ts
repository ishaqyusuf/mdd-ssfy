import type { Db } from "../types";
import {
	evaluateProductionSubmissionMaterialEvidence,
	type ProductionSubmissionItemScope,
} from "./service";

function parseItemScope(value: unknown): ProductionSubmissionItemScope[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row =
			item && typeof item === "object"
				? (item as Record<string, unknown>)
				: null;
		if (
			!row ||
			typeof row.controlUid !== "string" ||
			!Number.isInteger(row.salesItemId)
		) {
			return [];
		}
		return [
			{
				controlUid: row.controlUid,
				salesItemId: row.salesItemId as number,
				assignmentId: Number.isInteger(row.assignmentId)
					? (row.assignmentId as number)
					: null,
			},
		];
	});
}

export async function getProductionSubmissionMaterialReviewQueue(
	db: Db,
	input: {
		status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
		take: number;
		cursor?: number | null;
	},
) {
	const reviews = await db.salesProductionSubmissionMaterialReview.findMany({
		where: {
			status: input.status,
		},
		take: input.take + 1,
		skip: input.cursor ? 1 : undefined,
		cursor: input.cursor ? { id: input.cursor } : undefined,
		orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			status: true,
			classificationReason: true,
			submittedAt: true,
			updatedAt: true,
			reviewedAt: true,
			decisionNote: true,
			order: {
				select: {
					id: true,
					orderId: true,
					customer: {
						select: {
							name: true,
							businessName: true,
						},
					},
				},
			},
			submittedBy: {
				select: {
					id: true,
					name: true,
				},
			},
			reviewedBy: {
				select: {
					id: true,
					name: true,
				},
			},
			submissions: {
				where: { deletedAt: null },
				select: {
					qty: true,
				},
			},
		},
	});
	const hasNextPage = reviews.length > input.take;
	const page = hasNextPage ? reviews.slice(0, input.take) : reviews;
	return {
		rows: page.map((review) => ({
			...review,
			customer:
				review.order.customer?.businessName ||
				review.order.customer?.name ||
				null,
			submittedQty: review.submissions.reduce(
				(total, submission) => total + submission.qty,
				0,
			),
		})),
		nextCursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
	};
}

export async function getProductionSubmissionMaterialReviewDetail(
	db: Db,
	reviewId: number,
) {
	const review =
		await db.salesProductionSubmissionMaterialReview.findUniqueOrThrow({
			where: { id: reviewId },
			include: {
				order: {
					select: {
						id: true,
						orderId: true,
						customer: {
							select: {
								name: true,
								businessName: true,
							},
						},
					},
				},
				submittedBy: {
					select: { id: true, name: true },
				},
				reviewedBy: {
					select: { id: true, name: true },
				},
				submissions: {
					where: { deletedAt: null },
					select: {
						id: true,
						assignmentId: true,
						salesOrderItemId: true,
						qty: true,
						lhQty: true,
						rhQty: true,
						createdAt: true,
					},
				},
			},
		});
	const itemScope = parseItemScope(review.assignmentScope);
	const currentEvidence = await evaluateProductionSubmissionMaterialEvidence(
		db,
		{
			salesOrderId: review.salesOrderId,
			itemScope,
		},
	);
	const componentIds = Array.isArray(currentEvidence.materialSnapshot)
		? currentEvidence.materialSnapshot.flatMap((material) =>
				material && typeof material === "object"
					? (() => {
							const componentId = (material as Record<string, unknown>)
								.componentId;
							return Number.isInteger(componentId)
								? [componentId as number]
								: [];
						})()
					: [],
			)
		: [];
	const inboundDemands = componentIds.length
		? await db.inboundDemand.findMany({
				where: {
					deletedAt: null,
					status: {
						in: ["ordered", "partially_received"],
					},
					lineItemComponentId: { in: componentIds },
					inboundShipmentItemId: { not: null },
				},
				select: {
					lineItemComponentId: true,
					inboundShipmentItem: {
						select: {
							id: true,
							inboundId: true,
							qty: true,
							qtyGood: true,
							qtyIssue: true,
						},
					},
				},
			})
		: [];
	const linkedInboundReceiptMap = new Map<
		number,
		{
			inboundId: number;
			inboundShipmentItemId: number;
			lineItemComponentIds: number[];
			plannedQty: number;
			goodQty: number;
			issueQty: number;
			receivedQty: number;
		}
	>();
	for (const demand of inboundDemands) {
		const item = demand.inboundShipmentItem;
		if (!item) continue;
		const existing = linkedInboundReceiptMap.get(item.id);
		if (existing) {
			existing.lineItemComponentIds = Array.from(
				new Set([...existing.lineItemComponentIds, demand.lineItemComponentId]),
			);
			continue;
		}
		linkedInboundReceiptMap.set(item.id, {
			inboundId: item.inboundId,
			inboundShipmentItemId: item.id,
			lineItemComponentIds: [demand.lineItemComponentId],
			plannedQty: item.qty,
			goodQty: Number(item.qtyGood || 0),
			issueQty: Number(item.qtyIssue || 0),
			receivedQty: Number(item.qtyGood || 0) + Number(item.qtyIssue || 0),
		});
	}
	const linkedInboundReceipts = Array.from(linkedInboundReceiptMap.values());
	return {
		...review,
		itemScope,
		currentEvidence,
		linkedInboundReceipts,
		isStale: currentEvidence.materialRevision !== review.materialRevision,
	};
}

export { parseItemScope };
