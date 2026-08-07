import type { Db } from "@gnd/db";
import { receiveInboundShipment } from "@gnd/inventory/inbound";
import { hasQty } from "@gnd/utils/sales";

import { fulfillSalesInventoryNeedsManually } from "./manual-fulfill-sales-inventory-needs";
import {
	decideProductionSubmissionMaterialReview,
	getProductionSubmissionMaterialReviewDetail,
} from "./production-submission-review";
import { getSaleInformation } from "./sales-control/get-sale-information";
import { submitAllTask } from "./sales-control/tasks";
import {
	type SalesInventoryMarkAsAction,
	type SalesInventoryMarkAsPreflightResult,
	getSalesInventoryMarkAsPreflight,
	overrideSalesInventoryMarkAsAvailabilityForContinue,
} from "./sales-inventory-mark-as-preflight";

type ResolutionActor = {
	id: number;
	name: string;
};

type PendingReviewRow = {
	id: number;
	salesOrderId: number;
	updatedAt: Date;
	submissions: Array<{
		id: number;
		qty: number;
	}>;
};

type LinkedInboundDemandRow = {
	lineItemComponentId: number;
	lineItemComponent: {
		parent: {
			saleId: number | null;
		};
	};
	inboundShipmentItem: {
		id: number;
		inboundId: number;
		qty: number;
		qtyGood: number | null;
		qtyIssue: number | null;
		inbound: {
			status: string;
		};
	} | null;
};

export type SalesStatusMarkAsAutomationPreview = {
	affectedSalesOrderCount: number;
	pendingProductionReviewCount: number;
	pendingProductionSubmissionCount: number;
	pendingProductionQty: number;
	productionSubmissionCountToPrepare: number;
	productionQtyToPrepare: number;
	inboundShipmentCount: number;
	inboundItemCount: number;
	inboundQtyToReceive: number;
	manualAvailabilityComponentCount: number;
	autoPaymentReview: boolean;
	willCompleteDispatch: boolean;
};

export type SalesStatusMarkAsPreflightResult =
	SalesInventoryMarkAsPreflightResult & {
		automation: SalesStatusMarkAsAutomationPreview;
	};

export type ResolveSalesStatusMarkAsDependenciesResult = {
	action: SalesInventoryMarkAsAction;
	continueAllowed: boolean;
	receivedInboundShipmentCount: number;
	receivedInboundItemCount: number;
	receivedInboundQty: number;
	manuallyFulfilledComponentCount: number;
	overriddenSalesOrderCount: number;
	approvedProductionReviewCount: number;
	preparedProductionSubmissionCount: number;
	preparedProductionQty: number;
	preflight: SalesStatusMarkAsPreflightResult;
	remainingPreflight: SalesStatusMarkAsPreflightResult;
};

type ResolutionDependencies = {
	getStatusPreflight?: typeof getSalesStatusMarkAsPreflight;
	loadContext?: typeof loadAutomationContext;
	getPendingReviews?: typeof getPendingReviews;
	overrideAvailability?: typeof overrideSalesInventoryMarkAsAvailabilityForContinue;
	receiveInbound?: typeof receiveInboundShipment;
	manualFulfill?: typeof fulfillSalesInventoryNeedsManually;
	getReviewDetail?: typeof getProductionSubmissionMaterialReviewDetail;
	decideReview?: typeof decideProductionSubmissionMaterialReview;
	prepareProduction?: typeof prepareAutomaticProductionForStatusMark;
};

type StatusPreflightDependencies = {
	getInventoryPreflight?: typeof getSalesInventoryMarkAsPreflight;
	loadContext?: typeof loadAutomationContext;
	getPendingProductionWork?: typeof getPendingAutomaticProductionWork;
};

type PendingAutomaticProductionWork = {
	salesOrderId: number;
	itemUids: string[];
	submissionCount: number;
	qty: number;
};

const ACTIVE_INBOUND_STATUSES = [
	"pending",
	"in_progress",
	"issue_open",
] as const;

function normalizeSalesOrderIds(salesOrderIds: number[]) {
	return Array.from(new Set(salesOrderIds)).filter(
		(id) => Number.isInteger(id) && id > 0,
	);
}

function submissionQty(qty: unknown) {
	if (!qty || typeof qty !== "object") return 0;
	const value = qty as {
		qty?: number | null;
		lh?: number | null;
		rh?: number | null;
	};
	const total = Number(value.qty || 0);
	return total > 0 ? total : Number(value.lh || 0) + Number(value.rh || 0);
}

async function getPendingAutomaticProductionWork(
	db: Db,
	salesOrderIds: number[],
): Promise<PendingAutomaticProductionWork[]> {
	return Promise.all(
		salesOrderIds.map(async (salesOrderId) => {
			const info = await getSaleInformation(
				db,
				{ salesId: salesOrderId },
				{ persistDerivedState: false },
			);
			const itemUids = new Set<string>();
			let submissionCount = 0;
			let qty = 0;

			for (const item of info.items) {
				if (!item.itemConfig?.production || !item.controlUid) continue;
				const pendingQuantities = [
					item.analytics?.assignment?.pending,
					...(item.analytics?.pendingSubmissions || []).map(
						(submission) => submission.qty,
					),
				].filter((pending) => hasQty(pending));
				if (!pendingQuantities.length) continue;

				itemUids.add(item.controlUid);
				submissionCount += pendingQuantities.length;
				qty += pendingQuantities.reduce(
					(total, pending) => total + submissionQty(pending),
					0,
				);
			}

			return {
				salesOrderId,
				itemUids: Array.from(itemUids),
				submissionCount,
				qty,
			};
		}),
	);
}

async function prepareAutomaticProductionForStatusMark(
	db: Db,
	input: {
		salesOrderIds: number[];
		authorId: number;
		authorName: string;
	},
) {
	const work = await getPendingAutomaticProductionWork(db, input.salesOrderIds);
	let preparedProductionSubmissionCount = 0;
	let preparedProductionQty = 0;

	for (const item of work) {
		if (!item.itemUids.length) continue;
		await submitAllTask(
			db,
			{
				meta: {
					salesId: item.salesOrderId,
					authorId: input.authorId,
					authorName: input.authorName,
					allowProductionSubmissionForOthers: true,
				},
				submitAll: {
					itemUids: item.itemUids,
					submissionSource: "sales_mark_as_completed",
				},
			},
			{},
			{ emptySubmissionBehavior: "skip" },
		);
		preparedProductionSubmissionCount += item.submissionCount;
		preparedProductionQty += item.qty;
	}

	return {
		preparedProductionSubmissionCount,
		preparedProductionQty,
	};
}

function unresolvedReviewComponentIds(materialSnapshot: unknown) {
	if (!Array.isArray(materialSnapshot)) return [];

	return Array.from(
		new Set(
			materialSnapshot.flatMap((material) => {
				if (!material || typeof material !== "object") return [];
				const componentId = Number(
					(material as Record<string, unknown>).componentId || 0,
				);
				const readiness = String(
					(material as Record<string, unknown>).readiness || "",
				);
				return componentId > 0 &&
					readiness !== "ready_for_production" &&
					readiness !== "fulfilled"
					? [componentId]
					: [];
			}),
		),
	);
}

async function getPendingReviews(db: Db, salesOrderIds: number[]) {
	if (!salesOrderIds.length) return [] as PendingReviewRow[];

	return db.salesProductionSubmissionMaterialReview.findMany({
		where: {
			salesOrderId: { in: salesOrderIds },
			status: "PENDING",
		},
		orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			salesOrderId: true,
			updatedAt: true,
			submissions: {
				where: { deletedAt: null },
				select: { id: true, qty: true },
			},
		},
	}) as Promise<PendingReviewRow[]>;
}

async function getLinkedInboundDemands(db: Db, salesOrderIds: number[]) {
	if (!salesOrderIds.length) return [] as LinkedInboundDemandRow[];

	return db.inboundDemand.findMany({
		where: {
			deletedAt: null,
			status: { in: ["ordered", "partially_received"] },
			lineItemComponent: {
				parent: {
					saleId: { in: salesOrderIds },
					deletedAt: null,
					lineItemType: "SALE",
				},
			},
			inboundShipmentItem: {
				is: {
					deletedAt: null,
					inbound: {
						is: {
							deletedAt: null,
							status: { in: [...ACTIVE_INBOUND_STATUSES] },
						},
					},
				},
			},
		},
		orderBy: [{ inboundShipmentItemId: "asc" }, { id: "asc" }],
		select: {
			lineItemComponentId: true,
			lineItemComponent: {
				select: {
					parent: { select: { saleId: true } },
				},
			},
			inboundShipmentItem: {
				select: {
					id: true,
					inboundId: true,
					qty: true,
					qtyGood: true,
					qtyIssue: true,
					inbound: { select: { status: true } },
				},
			},
		},
	}) as Promise<LinkedInboundDemandRow[]>;
}

async function loadAutomationContext(db: Db, salesOrderIds: number[]) {
	const [reviews, inboundDemands] = await Promise.all([
		getPendingReviews(db, salesOrderIds),
		getLinkedInboundDemands(db, salesOrderIds),
	]);
	return { reviews, inboundDemands };
}

export async function getSalesStatusMarkAsPreflight(
	db: Db,
	input: {
		salesOrderIds: number[];
		action: SalesInventoryMarkAsAction;
	},
	dependencies: StatusPreflightDependencies = {},
): Promise<SalesStatusMarkAsPreflightResult> {
	const salesOrderIds = normalizeSalesOrderIds(input.salesOrderIds);
	const getInventoryPreflight =
		dependencies.getInventoryPreflight ?? getSalesInventoryMarkAsPreflight;
	const loadContext = dependencies.loadContext ?? loadAutomationContext;
	const getPendingProductionWork =
		dependencies.getPendingProductionWork ?? getPendingAutomaticProductionWork;
	const [inventoryPreflight, context, pendingProductionWork] =
		await Promise.all([
			getInventoryPreflight(db, {
				salesOrderIds,
				action: input.action,
			}),
			loadContext(db, salesOrderIds),
			input.action === "fulfilled"
				? getPendingProductionWork(db, salesOrderIds)
				: Promise.resolve([]),
		]);
	const inboundItems = new Map<
		number,
		NonNullable<LinkedInboundDemandRow["inboundShipmentItem"]>
	>();
	const inboundShipmentIds = new Set<number>();
	const affectedSalesOrderIds = new Set(
		inventoryPreflight.blockers.map((blocker) => blocker.salesOrderId),
	);
	for (const review of context.reviews) {
		affectedSalesOrderIds.add(review.salesOrderId);
	}
	for (const work of pendingProductionWork) {
		if (work.submissionCount > 0) {
			affectedSalesOrderIds.add(work.salesOrderId);
		}
	}
	for (const demand of context.inboundDemands) {
		const item = demand.inboundShipmentItem;
		if (!item) continue;
		inboundItems.set(item.id, item);
		inboundShipmentIds.add(item.inboundId);
	}
	const inboundQtyToReceive = Array.from(inboundItems.values()).reduce(
		(total, item) =>
			total +
			Math.max(
				0,
				Number(item.qty || 0) -
					Number(item.qtyGood || 0) -
					Number(item.qtyIssue || 0),
			),
		0,
	);
	const inboundComponentIds = new Set(
		context.inboundDemands.map((demand) => demand.lineItemComponentId),
	);
	const pendingProductionSubmissionCount = context.reviews.reduce(
		(total, review) => total + review.submissions.length,
		0,
	);
	const productionSubmissionCountToPrepare = pendingProductionWork.reduce(
		(total, work) => total + work.submissionCount,
		0,
	);
	const productionQtyToPrepare = pendingProductionWork.reduce(
		(total, work) => total + work.qty,
		0,
	);

	return {
		...inventoryPreflight,
		ok:
			inventoryPreflight.ok &&
			context.reviews.length === 0 &&
			productionSubmissionCountToPrepare === 0,
		canResolveAndContinue:
			!inventoryPreflight.ok ||
			context.reviews.length > 0 ||
			productionSubmissionCountToPrepare > 0,
		automation: {
			affectedSalesOrderCount: affectedSalesOrderIds.size,
			pendingProductionReviewCount: context.reviews.length,
			pendingProductionSubmissionCount:
				pendingProductionSubmissionCount + productionSubmissionCountToPrepare,
			pendingProductionQty:
				context.reviews.reduce(
					(total, review) =>
						total +
						review.submissions.reduce(
							(submissionTotal, submission) =>
								submissionTotal + Number(submission.qty || 0),
							0,
						),
					0,
				) + productionQtyToPrepare,
			productionSubmissionCountToPrepare,
			productionQtyToPrepare,
			inboundShipmentCount: inboundShipmentIds.size,
			inboundItemCount: inboundItems.size,
			inboundQtyToReceive,
			manualAvailabilityComponentCount: Math.max(
				0,
				inventoryPreflight.totals.unresolvedComponentCount -
					inboundComponentIds.size,
			),
			autoPaymentReview:
				context.reviews.length > 0 || productionSubmissionCountToPrepare > 0,
			willCompleteDispatch: input.action === "fulfilled",
		},
	};
}

export async function resolveSalesStatusMarkAsDependenciesForContinue(
	db: Db,
	input: {
		salesOrderIds: number[];
		action: SalesInventoryMarkAsAction;
		authorName?: string | null;
		triggeredByUserId?: number | string | null;
	},
	dependencies: ResolutionDependencies = {},
): Promise<ResolveSalesStatusMarkAsDependenciesResult> {
	const salesOrderIds = normalizeSalesOrderIds(input.salesOrderIds);
	const actor: ResolutionActor = {
		id: Number(input.triggeredByUserId || 0),
		name: input.authorName || "System",
	};
	const receiveInbound = dependencies.receiveInbound ?? receiveInboundShipment;
	const manualFulfill =
		dependencies.manualFulfill ?? fulfillSalesInventoryNeedsManually;
	const getReviewDetail =
		dependencies.getReviewDetail ?? getProductionSubmissionMaterialReviewDetail;
	const decideReview =
		dependencies.decideReview ?? decideProductionSubmissionMaterialReview;
	const prepareProduction =
		dependencies.prepareProduction ?? prepareAutomaticProductionForStatusMark;
	const getStatusPreflight =
		dependencies.getStatusPreflight ?? getSalesStatusMarkAsPreflight;
	const loadContext = dependencies.loadContext ?? loadAutomationContext;
	const findPendingReviews =
		dependencies.getPendingReviews ?? getPendingReviews;
	const overrideAvailability =
		dependencies.overrideAvailability ??
		overrideSalesInventoryMarkAsAvailabilityForContinue;
	const preflight = await getStatusPreflight(db, {
		salesOrderIds,
		action: input.action,
	});
	const initialContext = await loadContext(db, salesOrderIds);
	const inboundShipmentIds = Array.from(
		new Set(
			initialContext.inboundDemands.flatMap((demand) =>
				demand.inboundShipmentItem?.inboundId
					? [demand.inboundShipmentItem.inboundId]
					: [],
			),
		),
	);

	let receivedInboundItemCount = 0;
	let receivedInboundQty = 0;
	for (const inboundId of inboundShipmentIds) {
		const result = await receiveInbound(db, {
			inboundId,
			authorName: actor.name,
		});
		receivedInboundItemCount += result.receivedItemCount;
		receivedInboundQty += result.newlyReceivedQty;
	}

	let manuallyFulfilledComponentCount = 0;
	const blockedSalesOrderIds = Array.from(
		new Set(preflight.blockers.map((blocker) => blocker.salesOrderId)),
	);
	for (const salesOrderId of blockedSalesOrderIds) {
		const result = await manualFulfill(db, {
			salesOrderId,
			authorName: actor.name,
			triggeredByUserId: input.triggeredByUserId ?? null,
		});
		manuallyFulfilledComponentCount += result.fulfilledComponentCount;
	}

	let preparedProductionSubmissionCount = 0;
	let preparedProductionQty = 0;
	if (input.action === "fulfilled") {
		const prepared = await prepareProduction(db, {
			salesOrderIds,
			authorId: actor.id,
			authorName: actor.name,
		});
		preparedProductionSubmissionCount =
			prepared.preparedProductionSubmissionCount;
		preparedProductionQty = prepared.preparedProductionQty;
	}

	let approvedProductionReviewCount = 0;
	const pendingReviews = await findPendingReviews(db, salesOrderIds);
	for (const review of pendingReviews) {
		const detail = await getReviewDetail(db, review.id);
		const unresolvedComponentIds = unresolvedReviewComponentIds(
			detail.currentEvidence.materialSnapshot,
		);
		const action =
			detail.currentEvidence.classification.state === "finalized"
				? ("RECHECK_AND_APPROVE" as const)
				: detail.currentEvidence.classification.reason === "NOT_CONFIGURED" &&
						!unresolvedComponentIds.length
					? ("APPROVE_CONFIGURATION_EXCEPTION" as const)
					: ("MARK_AVAILABLE_AND_APPROVE" as const);
		if (
			action === "MARK_AVAILABLE_AND_APPROVE" &&
			!unresolvedComponentIds.length
		) {
			throw new Error(
				`Production material review #${review.id} is still pending without resolvable inventory components.`,
			);
		}
		const result = await decideReview(
			db,
			{
				reviewId: review.id,
				expectedUpdatedAt: review.updatedAt,
				action,
				note: "Approved automatically by the one-click sales status completion flow.",
			},
			actor,
		);
		if (result.status !== "APPROVED") {
			throw new Error(
				`Production material review #${review.id} still needs material resolution.`,
			);
		}
		approvedProductionReviewCount += 1;
	}

	const remainingPreflight = await getStatusPreflight(db, {
		salesOrderIds,
		action: input.action,
	});
	let overriddenSalesOrderCount = 0;
	let continueAllowed = remainingPreflight.ok;
	if (
		!continueAllowed &&
		remainingPreflight.automation.pendingProductionReviewCount === 0
	) {
		const overrideResult = await overrideAvailability(db, {
			salesOrderIds,
			action: input.action,
			authorName: actor.name,
			triggeredByUserId: input.triggeredByUserId ?? null,
		});
		overriddenSalesOrderCount = overrideResult.overriddenSalesOrderCount;
		continueAllowed = overrideResult.continueAllowed;
	}

	return {
		action: input.action,
		continueAllowed,
		receivedInboundShipmentCount: inboundShipmentIds.length,
		receivedInboundItemCount,
		receivedInboundQty,
		manuallyFulfilledComponentCount,
		overriddenSalesOrderCount,
		approvedProductionReviewCount,
		preparedProductionSubmissionCount,
		preparedProductionQty,
		preflight,
		remainingPreflight,
	};
}
