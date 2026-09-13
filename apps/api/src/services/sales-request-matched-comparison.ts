import { createHash } from "node:crypto";
import { isValidSalesRequestPilotFeedback } from "./sales-request-feedback";
import {
	SALES_REQUEST_COMPLEXITY_STRATA,
	SALES_REQUEST_COMPLEXITY_VERSION,
	type SalesRequestComplexityStratum,
} from "./sales-request-request-shape";

export const SALES_REQUEST_MATCHED_COMPARISON_VERSION =
	"request-shape-stable-rank-v1";
export const SALES_REQUEST_MATCHED_COMPARISON_MIN_CELL_SIZE = 5;

export type SalesRequestMatchedComparisonRow = {
	generationId?: string | null;
	actorUserId?: number | null;
	consumedSalesId?: number | null;
	status?: string | null;
	applyOutcome?: string | null;
	saveFinalOutcome?: string | null;
	startedAt?: Date | null;
	saveFinalAt?: Date | null;
	feedbackOutcome?: string | null;
	feedbackIssueCategories?: unknown;
	feedbackChangedFieldCategories?: unknown;
	requestComplexityVersion?: string | null;
	requestComplexityStratum?: string | null;
};

type PreparedRow = {
	rank: string;
	handlingTimeMs: number;
	edited: boolean;
};

type PreparedCell = {
	assistive: PreparedRow[];
	lowTouch: PreparedRow[];
};

type Blocker =
	| "arm-identity-incomplete"
	| "request-shape-incomplete"
	| "handling-time-incomplete"
	| "feedback-incomplete"
	| "no-common-request-shape"
	| "request-shape-arm-missing"
	| "request-shape-sample-too-small";

function isDate(value: unknown): value is Date {
	return value instanceof Date && Number.isFinite(value.getTime());
}

function percentile(values: readonly number[], proportion: number) {
	if (!values.length) return null;
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.ceil(proportion * sorted.length) - 1] ?? null;
}

function stableRank(generationId: string) {
	return createHash("sha256")
		.update(`${SALES_REQUEST_MATCHED_COMPARISON_VERSION}\0${generationId}`)
		.digest("hex");
}

function armMetrics(rows: readonly PreparedRow[]) {
	const handling = rows.map((row) => row.handlingTimeMs);
	const editedCount = rows.filter((row) => row.edited).length;
	return {
		matchedCount: rows.length,
		handlingTime: {
			p50Ms: percentile(handling, 0.5),
			p95Ms: percentile(handling, 0.95),
		},
		correctionRate: {
			reviewedCount: rows.length,
			acceptedWithEditsCount: editedCount,
			rateBasisPoints: rows.length
				? Math.round((editedCount * 10_000) / rows.length)
				: null,
		},
	};
}

function delta(
	assistive: ReturnType<typeof armMetrics>,
	lowTouch: ReturnType<typeof armMetrics>,
) {
	return {
		handlingTimeP95Ms:
			(lowTouch.handlingTime.p95Ms ?? 0) - (assistive.handlingTime.p95Ms ?? 0),
		correctionRateBasisPoints:
			(lowTouch.correctionRate.rateBasisPoints ?? 0) -
			(assistive.correctionRate.rateBasisPoints ?? 0),
	};
}

function addBlocker(blockers: Blocker[], blocker: Blocker) {
	if (!blockers.includes(blocker)) blockers.push(blocker);
}

/**
 * Produce equal-count, request-shape-stratified operational evidence. Matching
 * reduces structural imbalance but remains observational and cannot authorize
 * autonomous processing.
 */
export function buildSalesRequestMatchedComparison(
	rows: readonly SalesRequestMatchedComparisonRow[],
) {
	const blockers: Blocker[] = [];
	const cells = new Map<SalesRequestComplexityStratum, PreparedCell>(
		SALES_REQUEST_COMPLEXITY_STRATA.map((stratum) => [
			stratum,
			{ assistive: [], lowTouch: [] },
		]),
	);
	const finalizedRows = rows.filter(
		(row) =>
			row.status === "succeeded" &&
			row.applyOutcome === "applied" &&
			row.saveFinalOutcome === "saved",
	);

	for (const row of finalizedRows) {
		if (
			typeof row.generationId !== "string" ||
			!Number.isInteger(row.actorUserId) ||
			(row.actorUserId as number) <= 0 ||
			!(
				row.consumedSalesId === null ||
				(Number.isInteger(row.consumedSalesId) &&
					(row.consumedSalesId as number) > 0)
			)
		) {
			addBlocker(blockers, "arm-identity-incomplete");
			continue;
		}
		if (
			row.requestComplexityVersion !== SALES_REQUEST_COMPLEXITY_VERSION ||
			!SALES_REQUEST_COMPLEXITY_STRATA.includes(
				row.requestComplexityStratum as SalesRequestComplexityStratum,
			)
		) {
			addBlocker(blockers, "request-shape-incomplete");
			continue;
		}
		if (!isDate(row.startedAt) || !isDate(row.saveFinalAt)) {
			addBlocker(blockers, "handling-time-incomplete");
			continue;
		}
		const handlingTimeMs = row.saveFinalAt.getTime() - row.startedAt.getTime();
		if (handlingTimeMs < 0 || handlingTimeMs > 86_400_000) {
			addBlocker(blockers, "handling-time-incomplete");
			continue;
		}
		if (
			!isValidSalesRequestPilotFeedback(row) ||
			(row.feedbackOutcome !== "accepted" &&
				row.feedbackOutcome !== "accepted-with-edits")
		) {
			addBlocker(blockers, "feedback-incomplete");
			continue;
		}
		const cell = cells.get(
			row.requestComplexityStratum as SalesRequestComplexityStratum,
		);
		if (!cell) {
			addBlocker(blockers, "request-shape-incomplete");
			continue;
		}
		const prepared = {
			rank: stableRank(row.generationId),
			handlingTimeMs,
			edited: row.feedbackOutcome === "accepted-with-edits",
		};
		if (row.consumedSalesId === null) cell.assistive.push(prepared);
		else cell.lowTouch.push(prepared);
	}

	const byStratum: Array<{
		stratum: SalesRequestComplexityStratum;
		available: { assistive: number; lowTouch: number };
		assistive: ReturnType<typeof armMetrics>;
		lowTouch: ReturnType<typeof armMetrics>;
		observedLowTouchMinusAssistive: ReturnType<typeof delta>;
	}> = [];
	const pooledAssistive: PreparedRow[] = [];
	const pooledLowTouch: PreparedRow[] = [];
	let hasCommonShape = false;
	if (blockers.length === 0) {
		for (const stratum of SALES_REQUEST_COMPLEXITY_STRATA) {
			const cell = cells.get(stratum);
			if (!cell || (!cell.assistive.length && !cell.lowTouch.length)) continue;
			if (!cell.assistive.length || !cell.lowTouch.length) {
				addBlocker(blockers, "request-shape-arm-missing");
				continue;
			}
			hasCommonShape = true;
			const matchedCount = Math.min(
				cell.assistive.length,
				cell.lowTouch.length,
			);
			if (matchedCount < SALES_REQUEST_MATCHED_COMPARISON_MIN_CELL_SIZE) {
				addBlocker(blockers, "request-shape-sample-too-small");
			}
		}
		if (!hasCommonShape) addBlocker(blockers, "no-common-request-shape");
	}
	if (blockers.length === 0) {
		for (const stratum of SALES_REQUEST_COMPLEXITY_STRATA) {
			const cell = cells.get(stratum);
			if (!cell || !cell.assistive.length || !cell.lowTouch.length) continue;
			const matchedCount = Math.min(
				cell.assistive.length,
				cell.lowTouch.length,
			);
			const assistiveRows = [...cell.assistive]
				.sort((left, right) => left.rank.localeCompare(right.rank))
				.slice(0, matchedCount);
			const lowTouchRows = [...cell.lowTouch]
				.sort((left, right) => left.rank.localeCompare(right.rank))
				.slice(0, matchedCount);
			pooledAssistive.push(...assistiveRows);
			pooledLowTouch.push(...lowTouchRows);
			const assistive = armMetrics(assistiveRows);
			const lowTouch = armMetrics(lowTouchRows);
			byStratum.push({
				stratum,
				available: {
					assistive: cell.assistive.length,
					lowTouch: cell.lowTouch.length,
				},
				assistive,
				lowTouch,
				observedLowTouchMinusAssistive: delta(assistive, lowTouch),
			});
		}
	}

	const assistive = armMetrics(pooledAssistive);
	const lowTouch = armMetrics(pooledLowTouch);
	const observedLowTouchMinusAssistive = blockers.length
		? null
		: delta(assistive, lowTouch);

	return {
		method: "observational-request-shape-stratified" as const,
		matchingVersion: SALES_REQUEST_MATCHED_COMPARISON_VERSION,
		requestComplexityVersion: SALES_REQUEST_COMPLEXITY_VERSION,
		minimumCellSize: SALES_REQUEST_MATCHED_COMPARISON_MIN_CELL_SIZE,
		status: observedLowTouchMinusAssistive
			? ("descriptive-only" as const)
			: ("insufficient-evidence" as const),
		autonomyDecisionEligible: false,
		limitations: ["outcome-selected-arms", "not-randomized"] as const,
		blockers,
		byStratum,
		overall: {
			assistive,
			lowTouch,
			observedLowTouchMinusAssistive,
		},
	};
}
