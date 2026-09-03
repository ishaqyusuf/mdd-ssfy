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
