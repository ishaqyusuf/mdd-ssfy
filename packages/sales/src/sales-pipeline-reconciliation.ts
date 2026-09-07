import type { SalesPipelineSnapshot } from "./sales-pipeline";

export type SalesPipelineReconciliationCategory =
	| "clean"
	| "deterministic_repair"
	| "known_compatibility_difference"
	| "review_required"
	| "unsafe";

export type SalesPipelineProjectionEvidence = {
	exists: boolean;
	state: string | null;
	version: number | null;
	expectedVersion: number;
	sourceUpdatedAt: Date | null;
	orderUpdatedAt: Date | null;
	pipelineRevision: string | null;
	pipelineVersion: string | null;
};

type FulfillmentProofSourceRepairInput = {
	dispatchStatus: string | null;
	deliveredAt: Date | null;
	inventoryCommitted: boolean;
	dispatchCompletion: unknown;
};

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function nonEmptyString(value: unknown) {
	return typeof value === "string" && value.trim().length > 0;
}

function validDateString(value: unknown) {
	return nonEmptyString(value) && !Number.isNaN(Date.parse(value as string));
}

/**
 * Classifies only normalization of proof already persisted inside the
 * Dispatch-owned completion envelope. Legacy status/timestamps are supporting
 * consistency checks, never a substitute for missing delivery proof.
 */
export function classifyFulfillmentProofSourceRepair(
	input: FulfillmentProofSourceRepairInput,
) {
	const completion = record(input.dispatchCompletion);
	if (Object.hasOwn(completion, "status")) {
		if (completion.status === "completed") {
			return {
				category: "clean" as const,
				repairable: false,
				reasons: [] as string[],
				patch: null,
			};
		}
		return {
			category: "unsafe" as const,
			repairable: false,
			reasons: ["DISPATCH_COMPLETION_STATUS_CONFLICT"],
			patch: null,
		};
	}

	const hasExplicitCompletionEnvelope =
		nonEmptyString(completion.requestId) &&
		validDateString(completion.completedAt);
	if (!hasExplicitCompletionEnvelope) {
		return {
			category: "review_required" as const,
			repairable: false,
			reasons: ["DELIVERY_PROOF_NOT_RECONSTRUCTABLE"],
			patch: null,
		};
	}

	const reasons = [
		...(String(input.dispatchStatus || "")
			.trim()
			.toLowerCase() === "completed"
			? []
			: ["DISPATCH_NOT_TERMINAL"]),
		...(input.deliveredAt ? [] : ["DELIVERED_AT_MISSING"]),
		...(input.inventoryCommitted ? [] : ["INVENTORY_COMMIT_MISSING"]),
	];
	if (reasons.length) {
		return {
			category: "unsafe" as const,
			repairable: false,
			reasons,
			patch: null,
		};
	}

	return {
		category: "deterministic_repair" as const,
		repairable: true,
		reasons: ["DISPATCH_COMPLETION_STATUS_MISSING"],
		patch: { status: "completed" as const },
	};
}

export function classifySalesPipelineReconciliation(input: {
	snapshot: SalesPipelineSnapshot | null;
	projection: SalesPipelineProjectionEvidence;
}) {
	if (!input.snapshot) {
		return {
			category: "unsafe" as const,
			repairable: false,
			reasons: ["SNAPSHOT_MISSING"],
		};
	}
	const projectionReasons = [
		...(input.projection.exists ? [] : ["PROJECTION_MISSING"]),
		...(input.projection.state === "ready" ? [] : ["PROJECTION_NOT_READY"]),
		...(input.projection.version === input.projection.expectedVersion
			? []
			: ["PROJECTION_VERSION_MISMATCH"]),
		...(input.projection.sourceUpdatedAt?.getTime() ===
		input.projection.orderUpdatedAt?.getTime()
			? []
			: ["PROJECTION_SOURCE_STALE"]),
		...(input.projection.pipelineRevision === input.snapshot.revision
			? []
			: ["PIPELINE_REVISION_MISMATCH"]),
		...(input.projection.pipelineVersion === input.snapshot.version
			? []
			: ["PIPELINE_VERSION_MISMATCH"]),
	];
	if (projectionReasons.length) {
		return {
			category: "deterministic_repair" as const,
			repairable: true,
			reasons: projectionReasons,
		};
	}

	const blockingConflicts = input.snapshot.conflicts.filter(
		(conflict) => conflict.severity === "blocking",
	);
	if (blockingConflicts.length) {
		return {
			category: "review_required" as const,
			repairable: false,
			reasons: blockingConflicts.map((conflict) => conflict.code),
		};
	}

	const warnings = input.snapshot.conflicts.filter(
		(conflict) => conflict.severity === "warning",
	);
	if (warnings.length) {
		return {
			category: "known_compatibility_difference" as const,
			repairable: false,
			reasons: warnings.map((conflict) => conflict.code),
		};
	}
	return {
		category: "clean" as const,
		repairable: false,
		reasons: [] as string[],
	};
}

export function summarizeSalesPipelineReconciliation(
	items: Array<{ category: SalesPipelineReconciliationCategory }>,
) {
	return Object.fromEntries(
		(
			[
				"clean",
				"deterministic_repair",
				"known_compatibility_difference",
				"review_required",
				"unsafe",
			] as const
		).map((category) => [
			category,
			items.filter((item) => item.category === category).length,
		]),
	) as Record<SalesPipelineReconciliationCategory, number>;
}
