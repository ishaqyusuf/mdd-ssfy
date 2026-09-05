import type { Prisma } from "@gnd/db";

import {
	type ItemMaterialStatusCode,
	getDominantItemMaterialStatusCode,
	getItemMaterialStatusPresentation,
} from "../item-material-status";
import type { SalesPipelineSnapshot } from "../sales-pipeline";
import { getSalesPipelineSnapshots } from "../sales-pipeline-order";
import type { Db } from "../types";
import {
	classifyProductionMaterialReviewActionability,
	getProductionMaterialReviewInactivity,
} from "./actionability";
import {
	productionMaterialReviewScopeSubmissionSelect,
	validateProductionMaterialReviewAssignmentScope,
} from "./assignment-scope";
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

async function getSupersededReviewIds(
	db: Db,
	reviews: Array<{ id: number; salesOrderId: number; assignmentScope: unknown }>,
) {
	const scopedReviews = reviews
		.map((review) => ({ ...review, keys: reviewScopeKeys(review.assignmentScope) }))
		.filter((review) => review.keys.size > 0);
	const supersededIds = new Set<number>();
	if (!scopedReviews.length) return supersededIds;
	const orderIds = [...new Set(scopedReviews.map((review) => review.salesOrderId))];
	const firstReviewId = Math.min(...scopedReviews.map((review) => review.id));
	const latestByOrder = new Map<number, Map<string, number>>();
	let cursor: number | undefined;
	for (;;) {
		const newerReviews = await db.salesProductionSubmissionMaterialReview.findMany({
			where: {
				salesOrderId: { in: orderIds },
				id: { gt: firstReviewId },
				status: "PENDING",
				submissions: { some: { deletedAt: null } },
			},
			select: { id: true, salesOrderId: true, assignmentScope: true },
			orderBy: { id: "asc" },
			take: 250,
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
		});
		for (const candidate of newerReviews) {
			const latest = latestByOrder.get(candidate.salesOrderId) ?? new Map<string, number>();
			for (const key of reviewScopeKeys(candidate.assignmentScope)) {
				latest.set(key, Math.max(candidate.id, latest.get(key) ?? 0));
			}
			latestByOrder.set(candidate.salesOrderId, latest);
		}
		cursor = newerReviews.at(-1)?.id;
		if (newerReviews.length < 250 || !cursor) break;
	}
	for (const review of scopedReviews) {
		const latest = latestByOrder.get(review.salesOrderId);
		if ([...review.keys].some((key) => (latest?.get(key) ?? 0) > review.id)) {
			supersededIds.add(review.id);
		}
	}
	return supersededIds;
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
	getSupersededIds: typeof getSupersededReviewIds;
};

const defaultActionableReviewDependencies: ActionableReviewDependencies = {
	getSnapshots: getSalesPipelineSnapshots,
	evaluateEvidence: evaluateProductionSubmissionMaterialEvidence,
	getSupersededIds: getSupersededReviewIds,
};

async function* actionablePendingReviewPages(
	db: Db,
	where: Prisma.SalesProductionSubmissionMaterialReviewWhereInput,
	dependencies: ActionableReviewDependencies,
) {
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
					submittedById: true,
					submissions: {
						where: { deletedAt: null },
						select: productionMaterialReviewScopeSubmissionSelect,
					},
				},
				orderBy: { id: "asc" },
				take: 250,
				...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
			});
		if (!candidates.length) break;
		const [snapshots, supersededIds] = await Promise.all([
			dependencies.getSnapshots(db, candidates.map((candidate) => candidate.salesOrderId)),
			dependencies.getSupersededIds(db, candidates),
		]);
		const membership = candidates.map((candidate) => {
			const input = {
				reviewStatus: candidate.status,
				terminalOrder: isTerminalOrder(snapshots.get(candidate.salesOrderId)),
				activeSubmissionCount: candidate.submissions.length,
				superseded: supersededIds.has(candidate.id),
			};
			return getProductionMaterialReviewInactivity(input)
				? null
				: { candidate, input };
		});
		yield membership.filter((entry) => entry !== null);
		cursor = candidates.at(-1)?.id;
		if (candidates.length < 250 || !cursor) break;
	}
}

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
	for await (const page of actionablePendingReviewPages(db, where, dependencies)) {
		await Promise.all(
			page.map(async ({ candidate, input }) => {
				const currentEvidence = await dependencies.evaluateEvidence(db, {
					salesOrderId: candidate.salesOrderId,
					itemScope: parseItemScope(candidate.assignmentScope),
				});
				const materialStatus = getDominantItemMaterialStatusCode(
					currentEvidence.itemMaterialStatuses.map((status) => status.code),
				);
				const actionability = classifyProductionMaterialReviewActionability({
					...input,
					materialStatus,
					assignmentScopeIssues:
						validateProductionMaterialReviewAssignmentScope(candidate)
							.staleReasons,
				});
				if (actionability.actionable) {
					actionabilityById.set(candidate.id, {
						materialStatus,
						actionability,
					});
				}
			}),
		);
	}
	return actionabilityById;
}

export async function countActionableProductionSubmissionMaterialReviews(
	db: Db,
	where: Prisma.SalesProductionSubmissionMaterialReviewWhereInput = {},
	dependencyOverrides: Partial<ActionableReviewDependencies> = {},
) {
	const dependencies = {
		...defaultActionableReviewDependencies,
		...dependencyOverrides,
	};
	let count = 0;
	for await (const page of actionablePendingReviewPages(db, where, dependencies)) {
		count += page.length;
	}
	return count;
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
						assignmentScopeIssues: null,
					}),
			};
		}),
		nextCursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
	};
}

export async function getProductionSubmissionMaterialReviewDetail(
	db: Db,
	reviewId: number,
	dependencyOverrides: Partial<ActionableReviewDependencies> = {},
) {
	const dependencies = {
		...defaultActionableReviewDependencies,
		...dependencyOverrides,
	};
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
					select: productionMaterialReviewScopeSubmissionSelect,
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
	const currentEvidence = await dependencies.evaluateEvidence(db, {
		salesOrderId: review.salesOrderId,
		itemScope,
	});
	const pipeline = (
		await dependencies.getSnapshots(db, [review.salesOrderId])
	).get(review.salesOrderId);
	const materialStatus = getDominantItemMaterialStatusCode(
		currentEvidence.itemMaterialStatuses.map((status) => status.code),
	);
	const actionability = classifyProductionMaterialReviewActionability({
		reviewStatus: review.status,
		terminalOrder: isTerminalOrder(pipeline),
		activeSubmissionCount: activeSubmissions.length,
		superseded: (await dependencies.getSupersededIds(db, [review])).has(review.id),
		materialStatus,
		assignmentScopeIssues: validateProductionMaterialReviewAssignmentScope({
			...review,
			submissions: activeSubmissions,
		}).staleReasons,
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
	// Assignment proof is internal; preserve the existing viewer response fields.
	const publicSubmission = (
		submission: (typeof review.submissions)[number],
	) => ({
		id: submission.id,
		assignmentId: submission.assignmentId,
		salesOrderItemId: submission.salesOrderItemId,
		qty: submission.qty,
		lhQty: submission.lhQty,
		rhQty: submission.rhQty,
		createdAt: submission.createdAt,
		deletedAt: submission.deletedAt,
	});
	return {
		...review,
		pipelineRevision: pipeline?.revision ?? null,
		submissions: activeSubmissions.map(publicSubmission),
		retractedSubmissions: retractedSubmissions.map(publicSubmission),
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
