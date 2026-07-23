import type { Db } from "@gnd/db";
import type {
	InventoryImportSourceDisposition,
	InventoryImportSourceDispositionBatch,
} from "../../schema";
import { queueInventoryToDykeSync } from "../sync/inventory-to-dyke-sync-job";
import { inventoryImportSourceReview } from "./inventory-import-source-review";
import { resolveActiveInventoryImportScope } from "./resolve-active-inventory-import-scope";

type InventoryImportSourceDispositionSkipReason =
	| "not_found_or_no_longer_reviewable"
	| "changed_before_apply"
	| "target_not_active"
	| "target_kind_mismatch";

export type InventoryImportSourceDispositionResult =
	| {
			status: "applied";
			inventoryId: number;
			previousCategoryId: number;
			targetCategoryId: number;
			disposition: InventoryImportSourceDisposition["disposition"];
			auditEventId: number;
			syncQueued: boolean;
			syncRunId: string | null;
	  }
	| {
			status: "skipped";
			inventoryId: number;
			reason: InventoryImportSourceDispositionSkipReason;
	  };

function matchesDispositionBaseline(
	candidate: {
		categoryId: number;
		sourceStepUid: string | null;
		sourceComponentUid: string | null;
		sourceCustom: boolean;
	},
	input: InventoryImportSourceDisposition,
) {
	return (
		candidate.categoryId === input.baseline.categoryId &&
		candidate.sourceStepUid === input.baseline.sourceStepUid &&
		candidate.sourceComponentUid === input.baseline.sourceComponentUid &&
		candidate.sourceCustom === input.baseline.sourceCustom
	);
}

/**
 * Convert one reviewed import row into explicitly retained inventory. The row
 * moves to an active category, import ownership labels are detached, and the
 * authenticated actor plus before/after state are recorded in the generic
 * project Event audit stream inside the same transaction.
 */
export async function applyInventoryImportSourceDisposition(
	db: Db,
	input: InventoryImportSourceDisposition,
	actorId: number,
): Promise<InventoryImportSourceDispositionResult> {
	const result = await db.$transaction(async (tx) => {
		const transactionDb = tx as unknown as Db;
		const [scope, review] = await Promise.all([
			resolveActiveInventoryImportScope(transactionDb),
			inventoryImportSourceReview(transactionDb, {
				limit: 1,
				inventoryIds: [input.inventoryId],
			}),
		]);
		const candidate = review.candidates[0];
		if (!candidate) {
			return {
				status: "skipped",
				inventoryId: input.inventoryId,
				reason: "not_found_or_no_longer_reviewable",
			} as const;
		}
		if (!matchesDispositionBaseline(candidate, input)) {
			return {
				status: "skipped",
				inventoryId: input.inventoryId,
				reason: "changed_before_apply",
			} as const;
		}

		const target = await tx.inventoryCategory.findFirst({
			where: {
				id: input.targetCategoryId,
				deletedAt: null,
				uid: { in: scope.activeStepUids },
			},
			select: {
				id: true,
				uid: true,
				productKind: true,
			},
		});
		if (!target) {
			return {
				status: "skipped",
				inventoryId: input.inventoryId,
				reason: "target_not_active",
			} as const;
		}
		if (target.productKind !== candidate.productKind) {
			return {
				status: "skipped",
				inventoryId: input.inventoryId,
				reason: "target_kind_mismatch",
			} as const;
		}

		const retainedAsCustom = input.disposition === "retain_as_custom";
		const updated = await tx.inventory.updateMany({
			where: {
				id: input.inventoryId,
				deletedAt: null,
				inventoryCategoryId: input.baseline.categoryId,
				sourceStepUid: input.baseline.sourceStepUid,
				sourceComponentUid: input.baseline.sourceComponentUid,
				sourceCustom: input.baseline.sourceCustom,
			},
			data: {
				inventoryCategoryId: target.id,
				sourceStepUid: null,
				sourceComponentUid: null,
				sourceCustom: retainedAsCustom,
			},
		});
		if (updated.count !== 1) {
			return {
				status: "skipped",
				inventoryId: input.inventoryId,
				reason: "changed_before_apply",
			} as const;
		}

		const audit = await tx.event.create({
			data: {
				type: "inventory.import-source-disposition",
				userId: actorId,
				data: {
					inventoryId: input.inventoryId,
					disposition: input.disposition,
					previous: {
						categoryId: candidate.categoryId,
						sourceStepUid: candidate.sourceStepUid,
						sourceComponentUid: candidate.sourceComponentUid,
						sourceCustom: candidate.sourceCustom,
					},
					next: {
						categoryId: target.id,
						sourceStepUid: null,
						sourceComponentUid: null,
						sourceCustom: retainedAsCustom,
					},
				},
			},
			select: { id: true },
		});

		return {
			status: "applied",
			inventoryId: input.inventoryId,
			previousCategoryId: candidate.categoryId,
			targetCategoryId: target.id,
			disposition: input.disposition,
			auditEventId: audit.id,
		} as const;
	});

	if (result.status === "skipped") return result;

	const sync = await queueInventoryToDykeSync({
		inventoryId: input.inventoryId,
		source: "repair",
	});

	return {
		...result,
		syncQueued: Boolean(sync),
		syncRunId: sync?.id ?? null,
	};
}

/**
 * Apply a bounded batch as independent guarded row transactions. One stale row
 * cannot roll back or overwrite another row; callers receive exact per-row
 * applied/skipped evidence and each applied row keeps its own projection run.
 */
export async function applyInventoryImportSourceDispositionBatch(
	db: Db,
	input: InventoryImportSourceDispositionBatch,
	actorId: number,
) {
	const results: InventoryImportSourceDispositionResult[] = [];
	for (const item of input.items) {
		results.push(
			await applyInventoryImportSourceDisposition(db, item, actorId),
		);
	}

	return {
		results,
		appliedCount: results.filter((result) => result.status === "applied")
			.length,
		skippedCount: results.filter((result) => result.status === "skipped")
			.length,
	};
}
