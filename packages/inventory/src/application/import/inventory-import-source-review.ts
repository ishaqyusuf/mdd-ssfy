import type { Db } from "@gnd/db";
import type {
	InventoryImportSourceArchive,
	InventoryImportSourceReview,
} from "../../schema";
import { queueInventoryToDykeSync } from "../sync/inventory-to-dyke-sync-job";
import { resolveActiveInventoryImportScope } from "./resolve-active-inventory-import-scope";

export type InventoryImportSourceReviewReason =
	| "excluded_source_step"
	| "unknown_source_step"
	| "missing_source_step"
	| "missing_source_component";

export type InventoryImportSourceReviewStatus =
	| "archive_candidate"
	| "protected"
	| "custom_review";

export type InventoryImportSourceReviewCandidate = {
	inventoryId: number;
	inventoryUid: string;
	inventoryName: string;
	categoryId: number;
	categoryUid: string;
	categoryTitle: string;
	sourceStepUid: string | null;
	sourceComponentUid: string | null;
	sourceCustom: boolean;
	productKind: string;
	reason: InventoryImportSourceReviewReason;
	status: InventoryImportSourceReviewStatus;
	protectedReasons: string[];
	usage: {
		activeVariants: number;
		positiveStockRows: number;
		activeLineItems: number;
		activeLineItemComponents: number;
		activeAllocations: number;
		activeInboundDemands: number;
		storefrontPublished: boolean;
	};
};

export function classifyInventoryImportSourceReview(
	candidate: Omit<
		InventoryImportSourceReviewCandidate,
		"reason" | "status" | "protectedReasons"
	> & {
		knownStepUids: Set<string>;
		activeStepUids: Set<string>;
	},
): Pick<
	InventoryImportSourceReviewCandidate,
	"reason" | "status" | "protectedReasons"
> {
	const reason: InventoryImportSourceReviewReason = !candidate.sourceStepUid
		? "missing_source_step"
		: !candidate.sourceComponentUid
			? "missing_source_component"
			: !candidate.knownStepUids.has(candidate.sourceStepUid)
				? "unknown_source_step"
				: "excluded_source_step";

	const protectedReasons: string[] = [];
	if (candidate.usage.positiveStockRows > 0) {
		protectedReasons.push("positive_stock");
	}
	if (candidate.usage.activeLineItems > 0) {
		protectedReasons.push("active_line_items");
	}
	if (candidate.usage.activeLineItemComponents > 0) {
		protectedReasons.push("active_line_item_components");
	}
	if (candidate.usage.activeAllocations > 0) {
		protectedReasons.push("active_allocations");
	}
	if (candidate.usage.activeInboundDemands > 0) {
		protectedReasons.push("active_inbound_demands");
	}
	if (candidate.usage.storefrontPublished) {
		protectedReasons.push("storefront_published");
	}

	if (protectedReasons.length > 0) {
		return {
			reason,
			status: "protected",
			protectedReasons,
		};
	}

	return {
		reason,
		status: candidate.sourceCustom ? "custom_review" : "archive_candidate",
		protectedReasons,
	};
}

export async function inventoryImportSourceReview(
	db: Db,
	query: InventoryImportSourceReview,
) {
	const scope = await resolveActiveInventoryImportScope(db);
	const [steps, inventories] = await Promise.all([
		db.dykeSteps.findMany({
			where: { deletedAt: null },
			select: { uid: true, title: true },
		}),
		db.inventory.findMany({
			where: {
				deletedAt: null,
				...(query.inventoryIds?.length
					? { id: { in: query.inventoryIds } }
					: {}),
				OR: [
					{ sourceStepUid: null, sourceComponentUid: { not: null } },
					{ sourceStepUid: { not: null }, sourceComponentUid: null },
					{
						sourceStepUid: {
							notIn: scope.activeStepUids,
						},
					},
				],
			},
			orderBy: [{ inventoryCategoryId: "asc" }, { id: "asc" }],
			take: query.limit,
			select: {
				id: true,
				uid: true,
				name: true,
				productKind: true,
				sourceStepUid: true,
				sourceComponentUid: true,
				sourceCustom: true,
				publishedAt: true,
				primaryStoreFront: true,
				inventoryCategory: {
					select: {
						id: true,
						uid: true,
						title: true,
					},
				},
				variants: {
					where: { deletedAt: null },
					select: {
						_count: {
							select: {
								stocks: {
									where: { deletedAt: null, qty: { gt: 0 } },
								},
								stockAllocations: {
									where: {
										deletedAt: null,
										status: { notIn: ["released", "cancelled"] },
									},
								},
								inboundDemands: {
									where: {
										deletedAt: null,
										status: { notIn: ["received"] },
									},
								},
							},
						},
					},
				},
				_count: {
					select: {
						lineItems: {
							where: { deletedAt: null },
						},
						lineItemComponents: {
							where: {
								parent: { deletedAt: null },
							},
						},
					},
				},
			},
		}),
	]);

	const knownStepUids = new Set(
		steps.map((step) => step.uid).filter((uid): uid is string => Boolean(uid)),
	);
	const activeStepUids = new Set(scope.activeStepUids);
	const stepTitles = new Map(
		steps
			.filter((step): step is typeof step & { uid: string } =>
				Boolean(step.uid),
			)
			.map((step) => [step.uid, step.title]),
	);

	const candidates = inventories
		.filter((inventory) => Boolean(inventory.inventoryCategory))
		.map((inventory) => {
			const category = inventory.inventoryCategory;
			if (!category) return null;
			const usage = {
				activeVariants: inventory.variants.length,
				positiveStockRows: inventory.variants.reduce(
					(total, variant) => total + variant._count.stocks,
					0,
				),
				activeLineItems: inventory._count.lineItems,
				activeLineItemComponents: inventory._count.lineItemComponents,
				activeAllocations: inventory.variants.reduce(
					(total, variant) => total + variant._count.stockAllocations,
					0,
				),
				activeInboundDemands: inventory.variants.reduce(
					(total, variant) => total + variant._count.inboundDemands,
					0,
				),
				storefrontPublished:
					Boolean(inventory.publishedAt) ||
					Boolean(inventory.primaryStoreFront),
			};
			const base = {
				inventoryId: inventory.id,
				inventoryUid: inventory.uid,
				inventoryName: inventory.name,
				categoryId: category.id,
				categoryUid: category.uid,
				categoryTitle: category.title,
				sourceStepUid: inventory.sourceStepUid,
				sourceComponentUid: inventory.sourceComponentUid,
				sourceCustom: inventory.sourceCustom,
				productKind: inventory.productKind,
				usage,
				knownStepUids,
				activeStepUids,
			};
			return {
				...base,
				sourceStepTitle: inventory.sourceStepUid
					? stepTitles.get(inventory.sourceStepUid) || null
					: null,
				...classifyInventoryImportSourceReview(base),
			};
		})
		.filter((candidate): candidate is NonNullable<typeof candidate> =>
			Boolean(candidate),
		);

	const byStatus = {
		archiveCandidates: candidates.filter(
			(candidate) => candidate.status === "archive_candidate",
		).length,
		protected: candidates.filter(
			(candidate) => candidate.status === "protected",
		).length,
		customReview: candidates.filter(
			(candidate) => candidate.status === "custom_review",
		).length,
	};

	return {
		candidates,
		meta: {
			limit: query.limit,
			returned: candidates.length,
			...byStatus,
			excludedStepCount: scope.excludedStepUids.length,
			activeStepCount: scope.activeStepUids.length,
		},
	};
}

export type InventoryImportSourceArchiveResult = {
	mode: "compare" | "apply";
	requested: number;
	archivedIds: number[];
	queuedSyncCount: number;
	skipped: Array<{
		inventoryId: number;
		reason:
			| "not_found"
			| "protected"
			| "custom_review"
			| "not_archive_candidate"
			| "changed_before_apply";
	}>;
	candidates: InventoryImportSourceReviewCandidate[];
};

/**
 * Archive only rows that the source review currently classifies as safe,
 * standard, and unused. The default compare mode is intentionally read-only;
 * apply re-reads the bounded candidates in a transaction before soft-deleting
 * inventory rows and queuing the existing Dyke projection sync.
 */
export async function archiveInventoryImportSourceCandidates(
	db: Db,
	input: InventoryImportSourceArchive,
): Promise<InventoryImportSourceArchiveResult> {
	const review = await inventoryImportSourceReview(db, {
		limit: input.inventoryIds.length,
		inventoryIds: input.inventoryIds,
	});
	const reviewedById = new Map(
		review.candidates.map((candidate) => [candidate.inventoryId, candidate]),
	);
	const skipped: InventoryImportSourceArchiveResult["skipped"] = [];
	for (const inventoryId of input.inventoryIds) {
		const candidate = reviewedById.get(inventoryId);
		if (!candidate) {
			skipped.push({ inventoryId, reason: "not_found" });
		} else if (candidate.status === "protected") {
			skipped.push({ inventoryId, reason: "protected" });
		} else if (candidate.status === "custom_review") {
			skipped.push({ inventoryId, reason: "custom_review" });
		} else if (candidate.status !== "archive_candidate") {
			skipped.push({ inventoryId, reason: "not_archive_candidate" });
		}
	}

	if (!input.apply) {
		return {
			mode: "compare",
			requested: input.inventoryIds.length,
			archivedIds: [],
			queuedSyncCount: 0,
			skipped,
			candidates: review.candidates,
		};
	}

	const reviewedIds = input.inventoryIds.filter((inventoryId) => {
		const candidate = reviewedById.get(inventoryId);
		return candidate?.status === "archive_candidate";
	});
	if (!reviewedIds.length) {
		return {
			mode: "apply",
			requested: input.inventoryIds.length,
			archivedIds: [],
			queuedSyncCount: 0,
			skipped,
			candidates: review.candidates,
		};
	}

	const transactionResult = await db.$transaction(async (tx) => {
		const transactionDb = tx as unknown as Db;
		const current = await inventoryImportSourceReview(transactionDb, {
			limit: reviewedIds.length,
			inventoryIds: reviewedIds,
		});
		const currentById = new Map(
			current.candidates.map((candidate) => [candidate.inventoryId, candidate]),
		);
		const safeIds = reviewedIds.filter(
			(inventoryId) =>
				currentById.get(inventoryId)?.status === "archive_candidate",
		);
		if (!safeIds.length) {
			return { archivedIds: [], changedIds: reviewedIds };
		}

		const archived = await tx.inventory.updateMany({
			where: {
				id: { in: safeIds },
				deletedAt: null,
				sourceCustom: false,
			},
			data: { deletedAt: new Date(), status: "archived" },
		});
		if (!archived.count) {
			return { archivedIds: [], changedIds: safeIds };
		}

		const confirmed = await tx.inventory.findMany({
			where: { id: { in: safeIds }, deletedAt: { not: null } },
			select: { id: true },
		});
		const archivedIds = confirmed.map((row) => row.id);
		return {
			archivedIds,
			changedIds: safeIds.filter((id) => !archivedIds.includes(id)),
		};
	});
	const archivedIds = transactionResult.archivedIds;
	for (const inventoryId of transactionResult.changedIds) {
		if (!skipped.some((row) => row.inventoryId === inventoryId)) {
			skipped.push({ inventoryId, reason: "changed_before_apply" });
		}
	}

	for (const inventoryId of archivedIds) {
		await queueInventoryToDykeSync({
			inventoryId,
			source: "repair",
		});
	}

	return {
		mode: "apply",
		requested: input.inventoryIds.length,
		archivedIds,
		queuedSyncCount: archivedIds.length,
		skipped,
		candidates: review.candidates,
	};
}
