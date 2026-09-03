import {
	type SalesPipelineSnapshot,
	compareSalesPipelineShadow,
} from "./sales-pipeline";

export type SalesPipelineReadMode = "legacy" | "shadow" | "canonical";
export type SalesPipelineCommandMode = SalesPipelineReadMode;

export function getSalesPipelineReadMode(
	env: Record<string, string | undefined> = process.env,
): SalesPipelineReadMode {
	const configured = env.SALES_PIPELINE_READ_MODE?.trim().toLowerCase();
	if (
		configured === "legacy" ||
		configured === "shadow" ||
		configured === "canonical"
	) {
		return configured;
	}
	return env.NODE_ENV === "production" ? "shadow" : "canonical";
}

export function getSalesPipelineCommandMode(
	env: Record<string, string | undefined> = process.env,
): SalesPipelineCommandMode {
	const configured = env.SALES_PIPELINE_COMMAND_MODE?.trim().toLowerCase();
	if (
		configured === "legacy" ||
		configured === "shadow" ||
		configured === "canonical"
	) {
		return configured;
	}
	return env.NODE_ENV === "production" ? "shadow" : "canonical";
}

function cohortBucket(salesOrderId: number) {
	return Math.abs(Math.imul(salesOrderId, 2_654_435_761)) % 100;
}

export function shouldServeCanonicalSalesPipeline(
	salesOrderId: number,
	env: Record<string, string | undefined> = process.env,
) {
	if (getSalesPipelineReadMode(env) !== "canonical") return false;
	const percentage = Math.min(
		100,
		Math.max(0, Number(env.SALES_PIPELINE_COHORT_PERCENT || 100)),
	);
	return cohortBucket(salesOrderId) < percentage;
}

export function shouldEnforceCanonicalSalesPipelineCommands(
	salesOrderId: number,
	env: Record<string, string | undefined> = process.env,
) {
	if (getSalesPipelineCommandMode(env) !== "canonical") return false;
	const percentage = Math.min(
		100,
		Math.max(0, Number(env.SALES_PIPELINE_COHORT_PERCENT || 100)),
	);
	return cohortBucket(salesOrderId) < percentage;
}

export function selectSalesPipelineReadProjection(
	snapshot: SalesPipelineSnapshot,
	env: Record<string, string | undefined> = process.env,
) {
	return shouldServeCanonicalSalesPipeline(snapshot.evidence.salesOrderId, env)
		? snapshot
		: null;
}

export function observeSalesPipelineReadProjection(
	snapshot: SalesPipelineSnapshot,
	input: {
		surface: string;
		legacyHeadline?: string | null;
		legacyProductionIncluded?: boolean | null;
		legacyFulfillmentIncluded?: boolean | null;
		latencyMs?: number | null;
	},
	env: Record<string, string | undefined> = process.env,
) {
	const selected = selectSalesPipelineReadProjection(snapshot, env);
	if (getSalesPipelineReadMode(env) !== "shadow") return selected;
	const samplePercent = Math.min(
		100,
		Math.max(0, Number(env.SALES_PIPELINE_SHADOW_SAMPLE_PERCENT || 5)),
	);
	if (cohortBucket(snapshot.evidence.salesOrderId) >= samplePercent) {
		return selected;
	}
	const comparison = compareSalesPipelineShadow(snapshot, input);
	console.info("[sales-pipeline-shadow]", {
		surface: input.surface,
		salesOrderId: snapshot.evidence.salesOrderId,
		canonicalRevision: comparison.canonicalRevision,
		differenceCodes: comparison.differences.map(
			(difference) => difference.code,
		),
		latencyMs: input.latencyMs ?? null,
	});
	return selected;
}

export function evaluateSalesPipelineCutoverGates(input: {
	unexplainedMembershipDifferences: number;
	unsafeTransitionDifferences: number;
	staleProjectionDifferences: number;
	p95LatencyMs: number;
	maxP95LatencyMs: number;
	conflictSampleComplete: boolean;
	operatorApproved: boolean;
}) {
	const failures = [
		...(input.unexplainedMembershipDifferences === 0
			? []
			: ["UNEXPLAINED_MEMBERSHIP_DIFFERENCES"]),
		...(input.unsafeTransitionDifferences === 0
			? []
			: ["UNSAFE_TRANSITION_DIFFERENCES"]),
		...(input.staleProjectionDifferences === 0
			? []
			: ["STALE_PROJECTION_DIFFERENCES"]),
		...(input.p95LatencyMs <= input.maxP95LatencyMs
			? []
			: ["LATENCY_GATE_FAILED"]),
		...(input.conflictSampleComplete ? [] : ["CONFLICT_SAMPLE_INCOMPLETE"]),
		...(input.operatorApproved ? [] : ["OPERATOR_APPROVAL_REQUIRED"]),
	];
	return { passed: failures.length === 0, failures };
}
