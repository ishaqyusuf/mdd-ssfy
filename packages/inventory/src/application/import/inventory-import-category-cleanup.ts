import type { Db } from "@gnd/db";
import type {
	InventoryImportCategoryCleanup,
	InventoryImportCategoryCleanupReview,
} from "../../schema";
import { queueInventoryToDykeSync } from "../sync/inventory-to-dyke-sync-job";
import { resolveActiveInventoryImportScope } from "./resolve-active-inventory-import-scope";

export type InventoryImportCategoryCleanupCandidate = {
	categoryId: number;
	categoryUid: string;
	categoryTitle: string;
	activeInventoryCount: number;
	activeStandardCount: number;
	activeCustomCount: number;
	status: "ready" | "blocked";
	blockingReason: "active_inventory_rows" | null;
};

export async function inventoryImportCategoryCleanupReview(
	db: Db,
	input: InventoryImportCategoryCleanupReview,
) {
	const scope = await resolveActiveInventoryImportScope(db);
	const [categories, targetCategories] = await Promise.all([
		db.inventoryCategory.findMany({
			where: {
				deletedAt: null,
				uid: { in: scope.staleImportedCategoryUids },
				...(input.categoryIds?.length ? { id: { in: input.categoryIds } } : {}),
			},
			orderBy: [{ title: "asc" }, { id: "asc" }],
			take: input.limit,
			select: {
				id: true,
				uid: true,
				title: true,
				inventories: {
					where: { deletedAt: null },
					select: {
						sourceCustom: true,
					},
				},
			},
		}),
		input.categoryIds?.length
			? Promise.resolve([])
			: db.inventoryCategory.findMany({
					where: {
						deletedAt: null,
						uid: { in: scope.activeStepUids },
					},
					orderBy: [{ title: "asc" }, { id: "asc" }],
					take: 100,
					select: {
						id: true,
						uid: true,
						title: true,
						productKind: true,
					},
				}),
	]);

	const candidates: InventoryImportCategoryCleanupCandidate[] = categories.map(
		(category) => {
			const activeCustomCount = category.inventories.filter(
				(inventory) => inventory.sourceCustom,
			).length;
			const activeInventoryCount = category.inventories.length;

			return {
				categoryId: category.id,
				categoryUid: category.uid,
				categoryTitle: category.title,
				activeInventoryCount,
				activeStandardCount: activeInventoryCount - activeCustomCount,
				activeCustomCount,
				status: activeInventoryCount === 0 ? "ready" : "blocked",
				blockingReason:
					activeInventoryCount === 0 ? null : "active_inventory_rows",
			};
		},
	);

	return {
		candidates,
		targetCategories,
		meta: {
			limit: input.limit,
			returned: candidates.length,
			ready: candidates.filter((candidate) => candidate.status === "ready")
				.length,
			blocked: candidates.filter((candidate) => candidate.status === "blocked")
				.length,
			staleCategoryCount: scope.staleImportedCategoryUids.length,
		},
	};
}

export type InventoryImportCategoryCleanupResult = {
	mode: "compare" | "apply";
	requested: number;
	archivedCategoryIds: number[];
	queuedSyncCount: number;
	skipped: Array<{
		categoryId: number;
		reason:
			| "not_found_or_not_stale"
			| "active_inventory_rows"
			| "changed_before_apply";
	}>;
	candidates: InventoryImportCategoryCleanupCandidate[];
};

/**
 * Archive stale imported categories only after every child inventory row has
 * already been dispositioned. Apply re-resolves the active route graph and
 * checks the no-live-children invariant inside the write transaction.
 */
export async function cleanupInventoryImportCategories(
	db: Db,
	input: InventoryImportCategoryCleanup,
): Promise<InventoryImportCategoryCleanupResult> {
	const review = await inventoryImportCategoryCleanupReview(db, {
		limit: input.categoryIds.length,
		categoryIds: input.categoryIds,
	});
	const reviewedById = new Map(
		review.candidates.map((candidate) => [candidate.categoryId, candidate]),
	);
	const skipped: InventoryImportCategoryCleanupResult["skipped"] = [];

	for (const categoryId of input.categoryIds) {
		const candidate = reviewedById.get(categoryId);
		if (!candidate) {
			skipped.push({ categoryId, reason: "not_found_or_not_stale" });
		} else if (candidate.status === "blocked") {
			skipped.push({ categoryId, reason: "active_inventory_rows" });
		}
	}

	if (!input.apply) {
		return {
			mode: "compare",
			requested: input.categoryIds.length,
			archivedCategoryIds: [],
			queuedSyncCount: 0,
			skipped,
			candidates: review.candidates,
		};
	}

	const reviewedReadyIds = input.categoryIds.filter(
		(categoryId) => reviewedById.get(categoryId)?.status === "ready",
	);
	if (!reviewedReadyIds.length) {
		return {
			mode: "apply",
			requested: input.categoryIds.length,
			archivedCategoryIds: [],
			queuedSyncCount: 0,
			skipped,
			candidates: review.candidates,
		};
	}

	const archivedCategoryIds = await db.$transaction(async (tx) => {
		const current = await inventoryImportCategoryCleanupReview(
			tx as unknown as Db,
			{
				limit: reviewedReadyIds.length,
				categoryIds: reviewedReadyIds,
			},
		);
		const currentReadyIds = new Set(
			current.candidates
				.filter((candidate) => candidate.status === "ready")
				.map((candidate) => candidate.categoryId),
		);
		const archived: number[] = [];

		for (const categoryId of reviewedReadyIds) {
			if (!currentReadyIds.has(categoryId)) continue;
			const result = await tx.inventoryCategory.updateMany({
				where: {
					id: categoryId,
					deletedAt: null,
					inventories: {
						none: { deletedAt: null },
					},
				},
				data: { deletedAt: new Date() },
			});
			if (result.count === 1) archived.push(categoryId);
		}

		return archived;
	});

	for (const categoryId of reviewedReadyIds) {
		if (
			!archivedCategoryIds.includes(categoryId) &&
			!skipped.some((row) => row.categoryId === categoryId)
		) {
			skipped.push({ categoryId, reason: "changed_before_apply" });
		}
	}

	const syncResults = await Promise.all(
		archivedCategoryIds.map((inventoryCategoryId) =>
			queueInventoryToDykeSync({
				inventoryCategoryId,
				source: "repair",
			}),
		),
	);

	return {
		mode: "apply",
		requested: input.categoryIds.length,
		archivedCategoryIds,
		queuedSyncCount: syncResults.filter(Boolean).length,
		skipped,
		candidates: review.candidates,
	};
}
