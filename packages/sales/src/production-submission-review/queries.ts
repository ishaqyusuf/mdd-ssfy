import type { Prisma } from "@gnd/db";

import {
	type ItemMaterialStatusCode,
	getDominantItemMaterialStatusCode,
	getItemMaterialStatusPresentation,
} from "../item-material-status";
import type { SalesPipelineSnapshot } from "../sales-pipeline";
import { getSalesPipelineSnapshots } from "../sales-pipeline-order";
import type { Db } from "../types";
import { classifyProductionMaterialReviewActionability } from "./actionability";
import {
	type ProductionSubmissionItemScope,
	evaluateProductionSubmissionMaterialEvidence,
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

function isTerminalOrder(snapshot: SalesPipelineSnapshot | undefined) {
	return Boolean(
		snapshot &&
			(snapshot.commercial.state === "cancelled" ||
				["fulfilled", "administratively_completed"].includes(
					snapshot.fulfillment.state,
				)),
	);
}

function reviewScopeKeys(value: unknown) {
	return new Set(
		parseItemScope(value).flatMap((scope) => [
			`control:${scope.controlUid}`,
			...(scope.assignmentId ? [`assignment:${scope.assignmentId}`] : []),
		]),
	);
}

async function isSupersededReview(
	db: Db,
	review: { id: number; salesOrderId: number; assignmentScope: unknown },
) {
	const currentKeys = reviewScopeKeys(review.assignmentScope);
	if (!currentKeys.size) return false;
	const newerReviews =
		await db.salesProductionSubmissionMaterialReview.findMany({
			where: {
				salesOrderId: review.salesOrderId,
				id: { gt: review.id },
				status: "PENDING",
				submissions: { some: { deletedAt: null } },
			},
			select: { assignmentScope: true },
		});
	return newerReviews.some((candidate) => {
		const candidateKeys = reviewScopeKeys(candidate.assignmentScope);
		return [...currentKeys].some((key) => candidateKeys.has(key));
	});
}

export function materialStatusFromStoredReview(review: {
	classificationReason?: string | null;
	materialSnapshot?: unknown;
}): ItemMaterialStatusCode {
	const snapshot = Array.isArray(review.materialSnapshot)
		? review.materialSnapshot
		: [];
	if (
		snapshot.some(
			(item) =>
				item &&
				typeof item === "object" &&
				(item as Record<string, unknown>).productionEligibilityConflict ===
					true,
		)
	) {
		return "material_conflict";
	}
	return review.classificationReason === "AWAITING_INBOUND"
		? "awaiting_inbound"
		: review.classificationReason === "ALLOCATION_REVIEW"
			? "allocation_approval"
			: review.classificationReason === "NOT_CONFIGURED"
				? "setup_needed"
				: review.classificationReason === "PROJECTION_UNAVAILABLE"
					? "status_unknown"
					: "material_shortage";
}

type ActionableReviewDependencies = {
	getSnapshots: typeof getSalesPipelineSnapshots;
	evaluateEvidence: typeof evaluateProductionSubmissionMaterialEvidence;
	isSuperseded: typeof isSupersededReview;
};

const defaultActionableReviewDependencies: ActionableReviewDependencies = {
	getSnapshots: getSalesPipelineSnapshots,
	evaluateEvidence: evaluateProductionSubmissionMaterialEvidence,
	isSuperseded: isSupersededReview,
};

export async function getActionablePendingReviewIds(
	db: Db,
	where: Prisma.SalesProductionSubmissionMaterialReviewWhereInput,
	dependencyOverrides: Partial<ActionableReviewDependencies> = {},
) {
	const dependencies = {
		...defaultActionableReviewDependencies,
		...dependencyOverrides,
	};
	const actionabilityById = new Map<
		number,
		{
			materialStatus: ItemMaterialStatusCode;
			actionability: ReturnType<
				typeof classifyProductionMaterialReviewActionability
			>;
		}
	>();
	let cursor: number | undefined;
	for (;;) {
		const candidates =
			await db.salesProductionSubmissionMaterialReview.findMany({
				where: {
					...where,
					status: "PENDING",
					submissions: { some: { deletedAt: null } },
				},
				select: {
					id: true,
					salesOrderId: true,
					status: true,
					assignmentScope: true,
					submissions: {
						where: { deletedAt: null },
						select: { id: true },
					},
				},
				orderBy: { id: "asc" },
				take: 250,
				...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
			});
		if (!candidates.length) break;
		const snapshots = await dependencies.getSnapshots(
			db,
			candidates.map((candidate) => candidate.salesOrderId),
		);
		await Promise.all(
			candidates.map(async (candidate) => {
				const currentEvidence = await dependencies.evaluateEvidence(db, {
					salesOrderId: candidate.salesOrderId,
					itemScope: parseItemScope(candidate.assignmentScope),
				});
				const materialStatus = getDominantItemMaterialStatusCode(
					currentEvidence.itemMaterialStatuses.map((status) => status.code),
				);
				const actionability = classifyProductionMaterialReviewActionability({
					reviewStatus: candidate.status,
					terminalOrder: isTerminalOrder(snapshots.get(candidate.salesOrderId)),
					activeSubmissionCount: candidate.submissions.length,
					superseded: await dependencies.isSuperseded(db, candidate),
					materialStatus,
				});
				if (actionability.actionable) {
					actionabilityById.set(candidate.id, {
						materialStatus,
						actionability,
					});
				}
			}),
		);
		cursor = candidates.at(-1)?.id;
		if (candidates.length < 250 || !cursor) break;
	}
	return actionabilityById;
}

export async function countActionableProductionSubmissionMaterialReviews(
	db: Db,
	where: Prisma.SalesProductionSubmissionMaterialReviewWhereInput = {},
	dependencyOverrides: Partial<ActionableReviewDependencies> = {},
) {
	return (await getActionablePendingReviewIds(db, where, dependencyOverrides))
		.size;
}

export async function getProductionSubmissionMaterialReviewQueue(
	db: Db,
	input: {
		status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
		take: number;
		cursor?: number | null;
		q?: string | null;
		salesOrderId?: number | null;
	},
) {
	const q = input.q?.trim();
	const where: Prisma.SalesProductionSubmissionMaterialReviewWhereInput = {
		status: input.status,
		salesOrderId: input.salesOrderId || undefined,
		...(q
			? {
					OR: [
						{ order: { orderId: { contains: q } } },
						{
							order: {
								customer: {
									OR: [
										{ name: { contains: q } },
										{ businessName: { contains: q } },
									],
								},
							},
						},
						{ submittedBy: { name: { contains: q } } },
					],
				}
			: {}),
	};
	const actionableReviewMap =
		input.status === "PENDING"
			? await getActionablePendingReviewIds(db, where)
			: null;
	const actionableIds = actionableReviewMap
		? [...actionableReviewMap.keys()]
		: null;
	const pageWhere: Prisma.SalesProductionSubmissionMaterialReviewWhereInput = {
		...where,
		...(actionableIds ? { id: { in: actionableIds } } : {}),
	};
	if (actionableIds && actionableIds.length === 0) {
		return { total: 0, totalSubmittedQty: 0, rows: [], nextCursor: null };
	}
	const [reviews, total, submittedAggregate] = await Promise.all([
		db.salesProductionSubmissionMaterialReview.findMany({
			where: pageWhere,
			take: input.take + 1,
			skip: input.cursor ? 1 : undefined,
			cursor: input.cursor ? { id: input.cursor } : undefined,
			orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
			select: {
				id: true,
				status: true,
				classificationReason: true,
				materialSnapshot: true,
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
		}),
		actionableIds
			? Promise.resolve(actionableIds.length)
			: db.salesProductionSubmissionMaterialReview.count({ where: pageWhere }),
		actionableIds
			? db.orderProductionSubmissions.aggregate({
					where: {
						deletedAt: null,
						materialReviewId: { in: actionableIds },
					},
					_sum: { qty: true },
				})
			: Promise.resolve(null),
	]);
	const hasNextPage = reviews.length > input.take;
	const page = hasNextPage ? reviews.slice(0, input.take) : reviews;
	return {
		total,
		totalSubmittedQty:
			submittedAggregate?._sum.qty ??
			page.reduce(
				(totalQty, review) =>
					totalQty +
					review.submissions.reduce(
						(submissionQty, submission) => submissionQty + submission.qty,
						0,
					),
				0,
			),
		rows: page.map((review) => {
			const submittedQty = review.submissions.reduce(
				(total, submission) => total + submission.qty,
				0,
			);
			const current = actionableReviewMap?.get(review.id);
			const materialStatusCode =
				current?.materialStatus ?? materialStatusFromStoredReview(review);
			return {
				...review,
				customer:
					review.order.customer?.businessName ||
					review.order.customer?.name ||
					null,
				submittedQty,
				materialStatus: getItemMaterialStatusPresentation(materialStatusCode),
				actionability:
					current?.actionability ??
					classifyProductionMaterialReviewActionability({
						reviewStatus: review.status,
						terminalOrder: false,
						activeSubmissionCount: review.submissions.length,
						superseded: false,
						materialStatus: materialStatusCode,
					}),
			};
		}),
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
					select: {
						id: true,
						assignmentId: true,
						salesOrderItemId: true,
						qty: true,
						lhQty: true,
						rhQty: true,
						createdAt: true,
						deletedAt: true,
					},
				},
			},
		});
	const activeSubmissions = review.submissions.filter(
		(submission) => !submission.deletedAt,
	);
	const retractedSubmissions = review.submissions.filter((submission) =>
		Boolean(submission.deletedAt),
	);
	const itemScope = parseItemScope(review.assignmentScope);
	const currentEvidence = await evaluateProductionSubmissionMaterialEvidence(
		db,
		{
			salesOrderId: review.salesOrderId,
			itemScope,
		},
	);
	const pipeline = (
		await getSalesPipelineSnapshots(db, [review.salesOrderId])
	).get(review.salesOrderId);
	const materialStatus = getDominantItemMaterialStatusCode(
		currentEvidence.itemMaterialStatuses.map((status) => status.code),
	);
	const actionability = classifyProductionMaterialReviewActionability({
		reviewStatus: review.status,
		terminalOrder: isTerminalOrder(pipeline),
		activeSubmissionCount: activeSubmissions.length,
		superseded: await isSupersededReview(db, review),
		materialStatus,
	});
	const productionItemControls = itemScope.length
		? await db.salesItemControl.findMany({
				where: {
					uid: { in: itemScope.map((item) => item.controlUid) },
					salesId: review.salesOrderId,
					deletedAt: null,
				},
				select: {
					uid: true,
					orderItemId: true,
					title: true,
					subtitle: true,
					sectionTitle: true,
					item: {
						select: {
							description: true,
							swing: true,
						},
					},
				},
			})
		: [];
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
		pipelineRevision: pipeline?.revision ?? null,
		submissions: activeSubmissions,
		retractedSubmissions,
		hasRetractedSubmissions: retractedSubmissions.length > 0,
		itemScope,
		productionItems: productionItemControls.map((item) => ({
			controlUid: item.uid,
			salesItemId: item.orderItemId,
			title: item.title || item.item?.description || "Production item",
			description:
				[
					item.sectionTitle &&
					!item.subtitle
						?.toLowerCase()
						.includes(item.sectionTitle.toLowerCase())
						? item.sectionTitle
						: null,
					item.subtitle,
					item.subtitle ? null : item.item?.swing,
				]
					.filter(Boolean)
					.join(" | ") || null,
		})),
		currentEvidence,
		actionability,
		linkedInboundReceipts,
		isStale: currentEvidence.materialRevision !== review.materialRevision,
	};
}

export { parseItemScope };
