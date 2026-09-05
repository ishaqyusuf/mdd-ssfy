import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { db, type Prisma } from "@gnd/db";
import {
	SALES_PIPELINE_CONTRACT_VERSION,
	type SalesPipelineShadowComparison,
	type SalesPipelineSnapshot,
	compareSalesPipelineShadow,
	salesOrderListProjectionVersion,
} from "@gnd/sales";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";
import {
	type DatabaseRetryOptions,
	runDatabaseCli,
	withDatabaseReadRetry,
} from "./sales-pipeline-database-retry";

const args = new Set(process.argv.slice(2));
const valueAfter = (flag: string) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
};
const projectionPageSize = Math.min(
	100,
	Math.max(1, Number(valueAfter("--page-size") || 20)),
);

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function normalized(value: unknown) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replaceAll("_", " ");
}

function legacyProductionIncluded(value: unknown) {
	return ![
		"",
		"n/a",
		"not required",
		"completed",
		"administratively completed",
	].includes(normalized(value));
}

function legacyFulfillmentIncluded(value: unknown) {
	return ![
		"",
		"n/a",
		"not required",
		"completed",
		"fulfilled",
		"administratively completed",
	].includes(normalized(value));
}

type ShadowDatabaseRetryOptions = DatabaseRetryOptions & {
	resetConnection?: () => Promise<void> | void;
};

async function resetProductionDatabaseConnection() {
	try {
		await db.$disconnect();
	} catch {
		// The next Prisma operation reconnects and re-resolves the provider host.
	}
}

export async function withShadowDatabaseReadRetry<T>(
	operation: () => Promise<T>,
	options: ShadowDatabaseRetryOptions = {},
) {
	const { resetConnection, ...retryOptions } = options;
	return withDatabaseReadRetry(operation, {
		...retryOptions,
		onRetry: async (error, attempt) => {
			await retryOptions.onRetry?.(error, attempt);
			await (resetConnection ?? resetProductionDatabaseConnection)();
		},
	});
}

export function percentile95(values: number[]) {
	if (!values.length) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	return (
		sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ??
		0
	);
}

export function buildShadowLatencyEvidence(input: {
	projectionPageLatencies: number[];
	resolverAuditLatencies: number[];
	projectionPageSize?: number;
}) {
	return {
		p95LatencyMs: percentile95(input.projectionPageLatencies),
		latencyMeasurement: {
			kind: "materialized-projection-page-read",
			sampleCount: input.projectionPageLatencies.length,
			pageSize: input.projectionPageSize ?? 20,
		},
		auditResolverP95LatencyMs: percentile95(input.resolverAuditLatencies),
		auditResolverLatencyMeasurement: {
			kind: "fresh-canonical-resolver-batch",
			sampleCount: input.resolverAuditLatencies.length,
			resolverBatchSize: 100,
		},
	};
}

export type ProjectionFreshnessObservation = {
	projectionRevision: string | null;
	snapshotRevision: string | null;
};

export function classifyProjectionFreshnessObservations(
	observations: ProjectionFreshnessObservation[],
): "fresh" | "persistent_stale" | "concurrent_change" {
	const latest = observations.at(-1);
	if (
		latest?.projectionRevision &&
		latest.projectionRevision === latest.snapshotRevision
	) {
		return "fresh";
	}
	const previous = observations.at(-2);
	if (
		previous &&
		latest &&
		previous.projectionRevision === latest.projectionRevision &&
		previous.snapshotRevision === latest.snapshotRevision
	) {
		return "persistent_stale";
	}
	return "concurrent_change";
}

type MembershipDifference =
	SalesPipelineShadowComparison["differences"][number];

export function classifyShadowMembershipDifferences(
	snapshot: SalesPipelineSnapshot,
	differences: MembershipDifference[],
): {
	classification: "explained" | "review_required" | "unexplained";
	reasons: string[];
} | null {
	const membership = differences.filter((difference) =>
		difference.code.includes("MEMBERSHIP"),
	);
	if (!membership.length) return null;
	const reasons = new Set<string>();
	let classification: "explained" | "review_required" | "unexplained" =
		"explained";
	const markReviewRequired = () => {
		if (classification !== "unexplained") classification = "review_required";
	};
	const markUnexplained = () => {
		classification = "unexplained";
	};
	for (const difference of membership) {
		const stage =
			difference.code === "PRODUCTION_MEMBERSHIP_MISMATCH"
				? snapshot.production
				: snapshot.fulfillment;
		const prefix =
			difference.code === "PRODUCTION_MEMBERSHIP_MISMATCH"
				? "PRODUCTION"
				: "FULFILLMENT";
		if (stage.applicability === "conflict") {
			markReviewRequired();
			for (const conflict of snapshot.conflicts.filter((item) =>
				item.dimensions.includes(prefix.toLowerCase()),
			)) {
				reasons.add(conflict.code);
			}
			if (!reasons.size) reasons.add(`${prefix}_APPLICABILITY_CONFLICT`);
			continue;
		}
		if (stage.applicability === "unknown") {
			markReviewRequired();
			reasons.add(`${prefix}_APPLICABILITY_UNKNOWN`);
			continue;
		}
		if (stage.applicability === "not_required") {
			if (difference.legacy === true && difference.canonical === false) {
				reasons.add(`${prefix}_EXPLICITLY_NOT_REQUIRED`);
			} else {
				markUnexplained();
				reasons.add(`${prefix}_UNEXPLAINED_MEMBERSHIP_DIRECTION`);
			}
			continue;
		}
		if (stage.state === "administratively_completed") {
			if (difference.legacy === true && difference.canonical === false) {
				reasons.add(`${prefix}_ADMINISTRATIVE_COMPLETION_DISTINCT`);
			} else {
				markUnexplained();
				reasons.add(`${prefix}_UNEXPLAINED_MEMBERSHIP_DIRECTION`);
			}
			continue;
		}
		if (
			stage.state === "completed" ||
			("operationallyComplete" in stage && stage.operationallyComplete)
		) {
			if (difference.legacy === true && difference.canonical === false) {
				reasons.add(`${prefix}_OPERATIONALLY_COMPLETED`);
			} else {
				markUnexplained();
				reasons.add(`${prefix}_UNEXPLAINED_MEMBERSHIP_DIRECTION`);
			}
			continue;
		}
		const configuredRequirement =
			prefix === "PRODUCTION"
				? snapshot.evidence.production.configuredRequirement
				: snapshot.evidence.fulfillment.configuredRequirement;
		const operationalEvidenceCount =
			prefix === "PRODUCTION"
				? snapshot.production.assignmentIds.length
				: snapshot.fulfillment.dispatchIds.length;
		if (
			difference.legacy === false &&
			difference.canonical === true &&
			stage.applicability === "required" &&
			(configuredRequirement === true ||
				stage.requiredQty > 0 ||
				operationalEvidenceCount > 0)
		) {
			if (configuredRequirement === true) {
				reasons.add(`${prefix}_EXPLICIT_CURRENT_REQUIREMENT`);
			}
			if (stage.requiredQty > 0) {
				reasons.add(`${prefix}_CURRENT_REQUIRED_QUANTITY`);
			}
			if (operationalEvidenceCount > 0) {
				reasons.add(`${prefix}_ACTIVE_OPERATIONAL_EVIDENCE`);
			}
			continue;
		}
		markUnexplained();
		reasons.add(`${prefix}_UNEXPLAINED_MEMBERSHIP`);
	}
	return { classification, reasons: [...reasons].sort() };
}

export function countShadowMembershipReasons(
	items: Array<{
		membershipClassification: string | null;
		membershipReasons: string[];
	}>,
) {
	const counts = new Map<string, number>();
	for (const item of items) {
		if (item.membershipClassification !== "review_required") continue;
		for (const reason of item.membershipReasons) {
			counts.set(reason, (counts.get(reason) ?? 0) + 1);
		}
	}
	return Object.fromEntries(
		[...counts.entries()].sort(([left], [right]) => left.localeCompare(right)),
	);
}

type ShadowProjectionRow = {
	salesOrderId: number;
	orderId: string | null;
	pipelineRevision: string | null;
	payload: unknown;
};

type ShadowReportDependencies = {
	readProjections: (
		query: Prisma.SalesOrderListProjectionFindManyArgs,
	) => Promise<ShadowProjectionRow[]>;
	readSnapshots: (salesOrderIds: number[]) => Promise<Map<number, SalesPipelineSnapshot>>;
};

export async function collectSalesPipelineShadowReport(
	dependencies: ShadowReportDependencies = {
		readProjections: (query) => db.salesOrderListProjection.findMany(query),
		readSnapshots: (salesOrderIds) => getSalesPipelineSnapshots(db, salesOrderIds),
	},
) {
	const startedAt = new Date();
	const projectionEligibility = {
		state: "ready",
		version: salesOrderListProjectionVersion(),
		pipelineContractVersion: SALES_PIPELINE_CONTRACT_VERSION,
	} satisfies Prisma.SalesOrderListProjectionWhereInput;
	const projectionPageLatencies: number[] = [];
	const resolverAuditLatencies: number[] = [];
	const rows: Array<{
		salesOrderId: number;
		orderId: string | null;
		pipelineRevision: string | null;
		payload: unknown;
	}> = [];
	let cursor: number | undefined;
	for (;;) {
		const queryStartedAt = performance.now();
		const page = await withShadowDatabaseReadRetry(() =>
			dependencies.readProjections({
				where: projectionEligibility,
				orderBy: { salesOrderId: "asc" },
				take: projectionPageSize,
				...(cursor ? { cursor: { salesOrderId: cursor }, skip: 1 } : {}),
				select: {
					salesOrderId: true,
					orderId: true,
					pipelineRevision: true,
					payload: true,
				},
			}),
		);
		projectionPageLatencies.push(performance.now() - queryStartedAt);
		rows.push(...page);
		cursor = page.at(-1)?.salesOrderId;
		if (page.length < projectionPageSize || !cursor) break;
	}
	if (!rows.length) {
		throw new Error("No eligible projections were audited. Empty evidence cannot authorize cutover.");
	}
	const freshSnapshots = new Map<number, SalesPipelineSnapshot>();
	for (let index = 0; index < rows.length; index += 100) {
		const batch = rows.slice(index, index + 100);
		const queryStartedAt = performance.now();
		const snapshots = await withShadowDatabaseReadRetry(() =>
			dependencies.readSnapshots(
				batch.map((row) => row.salesOrderId),
			),
		);
		resolverAuditLatencies.push(performance.now() - queryStartedAt);
		for (const [salesOrderId, snapshot] of snapshots) {
			freshSnapshots.set(salesOrderId, snapshot);
		}
	}
	const rowById = new Map(rows.map((row) => [row.salesOrderId, row]));
	const freshnessObservations = new Map<
		number,
		ProjectionFreshnessObservation[]
	>();
	const revalidationCandidateIds: number[] = [];
	for (const row of rows) {
		const snapshotRevision =
			freshSnapshots.get(row.salesOrderId)?.revision ?? null;
		const observations = [
			{
				projectionRevision: row.pipelineRevision,
				snapshotRevision,
			},
		];
		freshnessObservations.set(row.salesOrderId, observations);
		if (row.pipelineRevision !== snapshotRevision) {
			revalidationCandidateIds.push(row.salesOrderId);
		}
	}
	for (
		let round = 0;
		round < 2 && revalidationCandidateIds.length;
		round += 1
	) {
		for (let index = 0; index < revalidationCandidateIds.length; index += 100) {
			const salesOrderIds = revalidationCandidateIds.slice(index, index + 100);
			const latestRows = await withShadowDatabaseReadRetry(() =>
				dependencies.readProjections({
					where: { ...projectionEligibility, salesOrderId: { in: salesOrderIds } },
					select: {
						salesOrderId: true,
						orderId: true,
						pipelineRevision: true,
						payload: true,
					},
				}),
			);
			const latestRowById = new Map(
				latestRows.map((row) => [row.salesOrderId, row]),
			);
			const latestSnapshots = await withShadowDatabaseReadRetry(() =>
				dependencies.readSnapshots(salesOrderIds),
			);
			for (const salesOrderId of salesOrderIds) {
				const latestRow = latestRowById.get(salesOrderId);
				const latestSnapshot = latestSnapshots.get(salesOrderId);
				if (latestRow) rowById.set(salesOrderId, latestRow);
				else {
					const previousRow = rowById.get(salesOrderId);
					if (previousRow) rowById.set(salesOrderId, { ...previousRow, pipelineRevision: null, payload: {} });
				}
				if (latestSnapshot) freshSnapshots.set(salesOrderId, latestSnapshot);
				else freshSnapshots.delete(salesOrderId);
				freshnessObservations.get(salesOrderId)?.push({
					projectionRevision: latestRow?.pipelineRevision ?? null,
					snapshotRevision: latestSnapshot?.revision ?? null,
				});
			}
		}
	}
	const comparisons = [...rowById.values()].map((row) => {
		const payload = record(row.payload);
		const snapshot = freshSnapshots.get(row.salesOrderId);
		if (!snapshot?.revision || !row.pipelineRevision) return {
			salesOrderId: row.salesOrderId,
			orderNo: row.orderId,
			staleProjection: true,
			concurrentFreshnessChange: false,
			differenceCodes: [!snapshot?.revision ? "CANONICAL_EVIDENCE_MISSING" : "PROJECTION_EVIDENCE_MISSING"],
			membershipClassification: null,
			membershipReasons: [],
			unsafe: false,
		};
		const legacy = record(payload.pipelineLegacyPresentation);
		const comparison = compareSalesPipelineShadow(snapshot, {
			legacyHeadline:
				typeof legacy.status === "string" ? legacy.status : undefined,
			legacyProductionIncluded: legacyProductionIncluded(
				legacy.productionState,
			),
			legacyFulfillmentIncluded: legacyFulfillmentIncluded(
				legacy.fulfillmentState,
			),
		});
		const membershipClassification = classifyShadowMembershipDifferences(
			snapshot,
			comparison.differences,
		);
		const freshnessClassification = classifyProjectionFreshnessObservations(
			freshnessObservations.get(row.salesOrderId) ?? [],
		);
		return {
				salesOrderId: row.salesOrderId,
				orderNo: row.orderId,
				// The cutover gate consumes this count: changing evidence is not proof of freshness.
				staleProjection: freshnessClassification !== "fresh",
				concurrentFreshnessChange:
					freshnessClassification === "concurrent_change",
				differenceCodes: comparison.differences.map(
					(difference) => difference.code,
				),
				membershipClassification:
					membershipClassification?.classification ?? null,
				membershipReasons: membershipClassification?.reasons ?? [],
				unsafe:
					snapshot.conflicts.some(
						(conflict) => conflict.severity === "blocking",
					) &&
					["completed", "fulfilled", "delivered"].includes(
						normalized(legacy.status),
					),
		};
	});
	const membershipDifferences = comparisons.filter(
		(item) => item.membershipClassification,
	);
	const unexplainedMembershipDifferences = membershipDifferences.filter(
		(item) => item.membershipClassification === "unexplained",
	);
	const unsafeDifferences = comparisons.filter((item) => item.unsafe);
	const finishedAt = new Date();
	const latencyEvidence = buildShadowLatencyEvidence({
		projectionPageLatencies,
		resolverAuditLatencies,
		projectionPageSize,
	});
	const report = {
		contract: "sales-pipeline-shadow-report/v1",
		mode: "read-only",
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		durationMs: finishedAt.getTime() - startedAt.getTime(),
		comparedOrders: comparisons.length,
		unexplainedMembershipDifferences: unexplainedMembershipDifferences.length,
		explainedMembershipDifferences: membershipDifferences.filter(
			(item) => item.membershipClassification === "explained",
		).length,
		reviewRequiredMembershipDifferences: membershipDifferences.filter(
			(item) => item.membershipClassification === "review_required",
		).length,
		reviewRequiredMembershipReasonCounts:
			countShadowMembershipReasons(comparisons),
		unsafeTransitionDifferences: unsafeDifferences.length,
		headlineDifferences: comparisons.filter((item) =>
			item.differenceCodes.includes("HEADLINE_MISMATCH"),
		).length,
		staleProjectionDifferences: comparisons.filter(
			(item) => item.staleProjection,
		).length,
		concurrentFreshnessDifferences: comparisons.filter(
			(item) => item.concurrentFreshnessChange,
		).length,
		freshnessRevalidation: {
			candidateCount: revalidationCandidateIds.length,
			observationRounds: revalidationCandidateIds.length ? 2 : 0,
		},
		...latencyEvidence,
		conflictSampleComplete: args.has("--conflicts-reviewed"),
		operatorApproved: args.has("--operator-approved"),
		membershipReviewSamples: comparisons
			.filter((item) => item.membershipClassification === "review_required")
			.slice(0, 50),
		membershipReviewSampleSize: Math.min(
			50,
			membershipDifferences.filter(
				(item) => item.membershipClassification === "review_required",
			).length,
		),
		staleProjectionSamples: comparisons
			.filter((item) => item.staleProjection)
			.slice(0, 50),
		concurrentFreshnessSamples: comparisons
			.filter((item) => item.concurrentFreshnessChange)
			.slice(0, 50),
		samples: comparisons
			.filter((item) => item.differenceCodes.length || item.unsafe)
			.slice(0, 50),
		safety: {
			writesPerformed: false,
			cutoverRequiresSeparateOperatorApproval: true,
		},
	};
	return report;
}

async function main() {
	const report = await collectSalesPipelineShadowReport();
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = valueAfter("--output");
	if (outputPath) await writeFile(resolve(outputPath), serialized, "utf8");
	process.stdout.write(serialized);
}

if (import.meta.main) {
	await runDatabaseCli(main, () => db.$disconnect());
}
