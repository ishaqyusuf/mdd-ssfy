import type {
	ProductionMaterialReviewRepairOperation,
	ProductionMaterialReviewRepairPlan,
} from "@gnd/sales/production-submission-review";

export function productionMaterialReviewScanOperation(
	plan: ProductionMaterialReviewRepairPlan,
) {
	return plan.classification === "ambiguous" ? "unsafe" : plan.operation;
}

type PreparedReview = {
	operation: ProductionMaterialReviewRepairOperation | "unsafe";
	enabled: boolean;
	apply: () => Promise<boolean>;
};

/** Sequential read/plan/apply: never write after an already-observed failure. */
export async function runProductionMaterialReviewScan<
	Candidate extends { id: number },
>(options: {
	candidates: Candidate[];
	maxMutations: number;
	continueAfterUnsafeForReadOnlyAudit?: boolean;
	load: (candidate: Candidate) => Promise<PreparedReview>;
	onFailure: (
		candidate: Candidate,
		phase: "read" | "mutation",
		error: unknown,
	) => void;
}) {
	let mutationCount = 0;
	let lastSuccessfulReviewId: number | null = null;
	let stopReason: string | null = null;
	const unsafeReviewIds: number[] = [];
	for (const candidate of options.candidates) {
		let review: PreparedReview;
		try {
			review = await options.load(candidate);
		} catch (error) {
			options.onFailure(candidate, "read", error);
			stopReason = `unsafe_read:${candidate.id}`;
			break;
		}
		if (options.continueAfterUnsafeForReadOnlyAudit && review.enabled) {
			stopReason = `unsafe_audit_mutation_enabled:${candidate.id}`;
			break;
		}
		if (review.operation === "unsafe") {
			if (options.continueAfterUnsafeForReadOnlyAudit) {
				unsafeReviewIds.push(candidate.id);
				continue;
			}
			stopReason = `unsafe_plan:${candidate.id}`;
			break;
		}
		if (review.enabled) {
			if (mutationCount >= options.maxMutations) {
				stopReason = `mutation_limit:${candidate.id}`;
				break;
			}
			try {
				if (!(await review.apply())) {
					throw new Error(
						"Planned material review repair did not converge; re-audit before retrying.",
					);
				}
				mutationCount += 1;
			} catch (error) {
				options.onFailure(candidate, "mutation", error);
				stopReason = `mutation_failure:${candidate.id}`;
				break;
			}
		}
		lastSuccessfulReviewId = candidate.id;
	}
	return {
		mutationCount,
		lastSuccessfulReviewId,
		stopReason,
		...(options.continueAfterUnsafeForReadOnlyAudit ? { unsafeReviewIds } : {}),
	};
}

/** A supplied invalid bound must fail closed, never silently widen the cohort. */
export function readReconciliationInteger(
	args: string[],
	flag: string,
	fallback: number,
	minimum = 0,
) {
	const index = args.indexOf(flag);
	if (index < 0) return fallback;
	const raw = args[index + 1];
	if (!raw || !/^\d+$/.test(raw))
		throw new Error(`${flag} requires an integer >= ${minimum}.`);
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < minimum)
		throw new Error(`${flag} requires an integer >= ${minimum}.`);
	return value;
}
