import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { type Prisma, db } from "@gnd/db";
import {
	SALES_PIPELINE_CONTRACT_VERSION,
	type SalesPipelineShadowComparison,
	type SalesPipelineSnapshot,
	compareSalesPipelineShadow,
	isProductionScheduleAssignmentOpen,
	resolveSalesPipelineSnapshot,
	salesOrderListProjectionVersion,
} from "@gnd/sales";
import { evaluateSalesPipelineCommand } from "@gnd/sales/sales-pipeline-commands";
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

export function classifyAdministrativeResolutionPolicy(
	snapshot: SalesPipelineSnapshot,
) {
	const decide = (
		action:
			| "production.administrative_complete"
			| "fulfillment.administrative_complete",
	) => {
		const decision = evaluateSalesPipelineCommand(snapshot, {
			action,
			authorized: true,
			expectedRevision: snapshot.revision,
			administrativeOverride: true,
			administrativeOverrideReason:
				"Read-only shadow policy classification; no command executed.",
		});
		return { status: decision.status, reasons: decision.reasons };
	};
	const production = decide("production.administrative_complete");
	const fulfillment = decide("fulfillment.administrative_complete");
	return {
		readyMilestones: [
			...(production.status === "ready" ? (["production"] as const) : []),
			...(fulfillment.status === "ready" ? (["fulfillment"] as const) : []),
		],
		production,
		fulfillment,
		notAuthorization: true as const,
	};
}

export function simulateAdministrativeResolution(
	snapshot: SalesPipelineSnapshot,
) {
	const policy = classifyAdministrativeResolutionPolicy(snapshot);
	const administrativeCompletion = {
		method: "STATUS_ONLY" as const,
		recordedAt: "1970-01-01T00:00:00.000Z",
	};
	const simulated = resolveSalesPipelineSnapshot({
		...snapshot.evidence,
		production: {
			...snapshot.evidence.production,
			administrativeCompletion: policy.readyMilestones.includes("production")
				? administrativeCompletion
				: snapshot.evidence.production.administrativeCompletion,
		},
		fulfillment: {
			...snapshot.evidence.fulfillment,
			administrativeCompletion: policy.readyMilestones.includes("fulfillment")
				? administrativeCompletion
				: snapshot.evidence.fulfillment.administrativeCompletion,
		},
	});

	return {
		eligibleMilestones: policy.readyMilestones,
		resultingHeadline: simulated.headline.code,
		resultingProductionState: simulated.production.state,
		resultingFulfillmentState: simulated.fulfillment.state,
		remainingBlockingConflictCodes: simulated.conflicts
			.filter((conflict) => conflict.severity === "blocking")
			.map((conflict) => conflict.code),
		operationalFactsChanged: false as const,
		notAuthorization: true as const,
	};
}

export function classifyConflictSourceFacts(snapshot: SalesPipelineSnapshot) {
	const activeAssignments = snapshot.evidence.production.assignments.filter(
		(assignment) => assignment.active,
	);
	const activeSubmissions = snapshot.evidence.production.submissions.filter(
		(submission) => submission.active,
	);
	const assignmentEvidence = activeAssignments.map((assignment) => {
		const submissions = activeSubmissions
			.filter(
				(submission) =>
					submission.assignmentId == null ||
					submission.assignmentId === assignment.id,
			)
			.map((submission) => ({
				active: true,
				quantity: submission.quantity,
				reviewStatus: submission.reviewStatus,
			}));
		const open = isProductionScheduleAssignmentOpen({
			assignedQty: assignment.assignedQty,
			completedQty: assignment.completedQty,
			completedAt: assignment.completedAt,
			submissions,
		});
		const assignedQty = Math.max(0, Number(assignment.assignedQty) || 0);
		const completionEvidenced =
			Boolean(assignment.completedAt) || (assignedQty > 0 && !open);
		return { id: assignment.id, open, completionEvidenced };
	});
	const openProductionAssignmentIds = assignmentEvidence
		.filter((assignment) => assignment.open)
		.map((assignment) => assignment.id)
		.sort((left, right) => left - right);
	const completionEvidencedProductionAssignmentIds = assignmentEvidence
		.filter((assignment) => assignment.completionEvidenced)
		.map((assignment) => assignment.id)
		.sort((left, right) => left - right);
	const indeterminateProductionAssignmentIds = assignmentEvidence
		.filter((assignment) => !assignment.open && !assignment.completionEvidenced)
		.map((assignment) => assignment.id)
		.sort((left, right) => left - right);
	const openProductionAssignments = openProductionAssignmentIds.length;
	const completionEvidencedProductionAssignments =
		completionEvidencedProductionAssignmentIds.length;
	const indeterminateProductionAssignments =
		indeterminateProductionAssignmentIds.length;
	const productionAssignmentShape =
		activeAssignments.length === 0
			? "none"
			: openProductionAssignments === activeAssignments.length
				? "open_only"
				: completionEvidencedProductionAssignments === activeAssignments.length
					? "completion_evidenced_only"
					: indeterminateProductionAssignments === activeAssignments.length
						? "indeterminate_only"
						: openProductionAssignments > 0 &&
								completionEvidencedProductionAssignments > 0 &&
								indeterminateProductionAssignments > 0
							? "open_completion_evidenced_and_indeterminate"
							: openProductionAssignments > 0 &&
									completionEvidencedProductionAssignments > 0
								? "open_and_completion_evidenced"
								: openProductionAssignments > 0
									? "open_and_indeterminate"
									: "completion_evidenced_and_indeterminate";
	const completedItemDispatches =
		snapshot.evidence.fulfillment.dispatches.filter(
			(dispatch) =>
				dispatch.active &&
				dispatch.itemCount > 0 &&
				normalized(dispatch.status) === "completed",
		);
	const missingProofDispatches = completedItemDispatches.filter(
		(dispatch) => !dispatch.proofCompleted,
	);
	const missingInventoryDispatches = completedItemDispatches.filter(
		(dispatch) => !dispatch.inventoryCommitted,
	);
	const fulfillmentEvidenceGap =
		missingProofDispatches.length > 0 && missingInventoryDispatches.length > 0
			? "proof_and_inventory_missing"
			: missingProofDispatches.length > 0
				? "proof_missing"
				: missingInventoryDispatches.length > 0
					? "inventory_missing"
					: "none";

	return {
		productionAssignmentShape,
		activeProductionAssignments: activeAssignments.length,
		openProductionAssignments,
		openProductionAssignmentIds,
		completionEvidencedProductionAssignments,
		completionEvidencedProductionAssignmentIds,
		indeterminateProductionAssignments,
		indeterminateProductionAssignmentIds,
		fulfillmentEvidenceGap,
		completedItemDispatches: completedItemDispatches.length,
		missingProofDispatches: missingProofDispatches.length,
		missingProofDispatchIds: missingProofDispatches
			.map((dispatch) => dispatch.id)
			.sort((left, right) => left - right),
		missingInventoryDispatches: missingInventoryDispatches.length,
		missingInventoryDispatchIds: missingInventoryDispatches
			.map((dispatch) => dispatch.id)
			.sort((left, right) => left - right),
	};
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

export function isUnsafeShadowTransition(
	snapshot: SalesPipelineSnapshot,
	legacyHeadline: unknown,
	auditedOverrideRecords: {
		productionRecords?: Map<string, Set<string>>;
		fulfillmentRecords?: Map<string, Set<string>>;
	} = {},
) {
	const blockingConflicts = snapshot.conflicts.filter(
		(conflict) => conflict.severity === "blocking",
	);
	if (
		!blockingConflicts.length ||
		!["completed", "fulfilled", "delivered"].includes(
			normalized(legacyHeadline),
		)
	) {
		return false;
	}
	const productionRecordId =
		snapshot.evidence.production.administrativeCompletion?.recordId;
	const fulfillmentRecordId =
		snapshot.evidence.fulfillment.administrativeCompletion?.recordId;
	const productionExceptionCodes = productionRecordId
		? auditedOverrideRecords.productionRecords?.get(productionRecordId)
		: undefined;
	const fulfillmentExceptionCodes = fulfillmentRecordId
		? auditedOverrideRecords.fulfillmentRecords?.get(fulfillmentRecordId)
		: undefined;
	return blockingConflicts.some((conflict) => {
		const productionCovered =
			conflict.dimensions.includes("production") &&
			productionExceptionCodes?.has(conflict.code);
		const fulfillmentCovered =
			conflict.dimensions.some((dimension) =>
				["fulfillment", "dispatch"].includes(dimension),
			) && fulfillmentExceptionCodes?.has(conflict.code);
		return !productionCovered && !fulfillmentCovered;
	});
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
	readSnapshots: (
		salesOrderIds: number[],
	) => Promise<Map<number, SalesPipelineSnapshot>>;
	readAuditedAdministrativeOverrides?: (salesOrderIds: number[]) => Promise<
		Map<
			number,
			{
				productionRecords: Map<string, Set<string>>;
				fulfillmentRecords: Map<string, Set<string>>;
			}
		>
	>;
};

async function readAuditedAdministrativeOverrides(salesOrderIds: number[]) {
	const rows = await db.salesHistory.findMany({
		where: {
			salesId: { in: salesOrderIds },
			name: {
				in: [
					"Production completed — status only",
					"Fulfillment completed — status only",
				],
			},
			deletedAt: null,
		},
		select: { salesId: true, data: true },
	});
	const result = new Map<
		number,
		{
			productionRecords: Map<string, Set<string>>;
			fulfillmentRecords: Map<string, Set<string>>;
		}
	>();
	for (const row of rows) {
		const data = record(row.data);
		if (
			data.event !== "SALES_COMPLETION_MARKED" ||
			!record(data.administrativeOverride).reason ||
			typeof data.recordId !== "string"
		) {
			continue;
		}
		const current = result.get(row.salesId) ?? {
			productionRecords: new Map<string, Set<string>>(),
			fulfillmentRecords: new Map<string, Set<string>>(),
		};
		const exceptionCodes = new Set(
			Array.isArray(record(data.administrativeOverride).exceptionCodes)
				? (
						record(data.administrativeOverride).exceptionCodes as unknown[]
					).filter((code): code is string => typeof code === "string")
				: [],
		);
		if (data.milestone === "PRODUCTION_COMPLETED") {
			current.productionRecords.set(data.recordId, exceptionCodes);
		} else if (data.milestone === "FULFILLMENT_COMPLETED") {
			current.fulfillmentRecords.set(data.recordId, exceptionCodes);
		}
		result.set(row.salesId, current);
	}
	return result;
}

export async function collectSalesPipelineShadowReport(
	dependencies: ShadowReportDependencies = {
		readProjections: (query) => db.salesOrderListProjection.findMany(query),
		readSnapshots: (salesOrderIds) =>
			getSalesPipelineSnapshots(db, salesOrderIds),
		readAuditedAdministrativeOverrides,
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
		throw new Error(
			"No eligible projections were audited. Empty evidence cannot authorize cutover.",
		);
	}
	const freshSnapshots = new Map<number, SalesPipelineSnapshot>();
	const auditedAdministrativeOverrides = new Map<
		number,
		{
			productionRecords: Map<string, Set<string>>;
			fulfillmentRecords: Map<string, Set<string>>;
		}
	>();
	for (let index = 0; index < rows.length; index += 100) {
		const batch = rows.slice(index, index + 100);
		const queryStartedAt = performance.now();
		const salesOrderIds = batch.map((row) => row.salesOrderId);
		const snapshots = await withShadowDatabaseReadRetry(() =>
			dependencies.readSnapshots(salesOrderIds),
		);
		resolverAuditLatencies.push(performance.now() - queryStartedAt);
		for (const [salesOrderId, snapshot] of snapshots) {
			freshSnapshots.set(salesOrderId, snapshot);
		}
		const readAuditedAdministrativeOverrides =
			dependencies.readAuditedAdministrativeOverrides;
		if (readAuditedAdministrativeOverrides) {
			const records = await withShadowDatabaseReadRetry(() =>
				readAuditedAdministrativeOverrides(salesOrderIds),
			);
			for (const [salesOrderId, recordIds] of records) {
				auditedAdministrativeOverrides.set(salesOrderId, recordIds);
			}
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
					where: {
						...projectionEligibility,
						salesOrderId: { in: salesOrderIds },
					},
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
					if (previousRow)
						rowById.set(salesOrderId, {
							...previousRow,
							pipelineRevision: null,
							payload: {},
						});
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
		if (!snapshot?.revision || !row.pipelineRevision)
			return {
				salesOrderId: row.salesOrderId,
				orderNo: row.orderId,
				staleProjection: true,
				concurrentFreshnessChange: false,
				differenceCodes: [
					!snapshot?.revision
						? "CANONICAL_EVIDENCE_MISSING"
						: "PROJECTION_EVIDENCE_MISSING",
				],
				membershipClassification: null,
				membershipReasons: [],
				canonicalRevision: snapshot?.revision ?? null,
				legacyHeadline: null,
				blockingConflictCodes: [],
				administrativeResolutionPolicy: null,
				administrativeResolutionSimulation: null,
				conflictSourceFacts: null,
				unsafe: false,
			};
		const legacy = record(payload.pipelineLegacyPresentation);
		const legacyHeadline =
			typeof legacy.status === "string" ? legacy.status : null;
		const blockingConflictCodes = snapshot.conflicts
			.filter((conflict) => conflict.severity === "blocking")
			.map((conflict) => conflict.code);
		const comparison = compareSalesPipelineShadow(snapshot, {
			historicalHeadline: legacyHeadline ?? undefined,
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
			canonicalRevision: snapshot.revision,
			legacyHeadline,
			blockingConflictCodes,
			administrativeResolutionPolicy:
				classifyAdministrativeResolutionPolicy(snapshot),
			administrativeResolutionSimulation:
				simulateAdministrativeResolution(snapshot),
			conflictSourceFacts: classifyConflictSourceFacts(snapshot),
			unsafe: isUnsafeShadowTransition(
				snapshot,
				legacy.status,
				auditedAdministrativeOverrides.get(row.salesOrderId),
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
		unsafeTransitionSamples: unsafeDifferences,
		administrativeResolutionPolicyCounts: Object.fromEntries(
			Array.from(
				unsafeDifferences.reduce((counts, item) => {
					const key =
						item.administrativeResolutionPolicy?.readyMilestones.join("+") ||
						"none";
					counts.set(key, (counts.get(key) || 0) + 1);
					return counts;
				}, new Map<string, number>()),
			).sort(([left], [right]) => left.localeCompare(right)),
		),
		administrativeResolutionSimulationCounts: Object.fromEntries(
			Array.from(
				unsafeDifferences.reduce((counts, item) => {
					const simulation = item.administrativeResolutionSimulation;
					const milestones = simulation?.eligibleMilestones.join("+") || "none";
					const conflicts =
						simulation?.remainingBlockingConflictCodes.join("+") || "none";
					const key = simulation
						? `${milestones}=>${simulation.resultingHeadline}|${conflicts}`
						: "unavailable";
					counts.set(key, (counts.get(key) || 0) + 1);
					return counts;
				}, new Map<string, number>()),
			).sort(([left], [right]) => left.localeCompare(right)),
		),
		unsafeSourceFactArchetypeCounts: Object.fromEntries(
			Array.from(
				unsafeDifferences.reduce((counts, item) => {
					const facts = item.conflictSourceFacts;
					const key = facts
						? `${facts.productionAssignmentShape}|${facts.fulfillmentEvidenceGap}`
						: "unavailable";
					counts.set(key, (counts.get(key) || 0) + 1);
					return counts;
				}, new Map<string, number>()),
			).sort(([left], [right]) => left.localeCompare(right)),
		),
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
