import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { db } from "@gnd/db";
import {
	SALES_PIPELINE_CONTRACT_VERSION,
	type SalesPipelineShadowComparison,
	type SalesPipelineSnapshot,
	compareSalesPipelineShadow,
	salesOrderListProjectionVersion,
} from "@gnd/sales";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";

const args = new Set(process.argv.slice(2));
const valueAfter = (flag: string) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
};

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

export function percentile95(values: number[]) {
	if (!values.length) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	return (
		sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ??
		0
	);
}

type MembershipDifference =
	SalesPipelineShadowComparison["differences"][number];

export function classifyShadowMembershipDifferences(
	snapshot: SalesPipelineSnapshot,
	differences: MembershipDifference[],
) {
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

async function main() {
	const startedAt = new Date();
	const queryLatencies: number[] = [];
	const rows: Array<{
		salesOrderId: number;
		orderId: string | null;
		pipelineRevision: string | null;
		payload: unknown;
	}> = [];
	let cursor: number | undefined;
	for (;;) {
		const queryStartedAt = performance.now();
		const page = await db.salesOrderListProjection.findMany({
			where: {
				state: "ready",
				version: salesOrderListProjectionVersion(),
				pipelineContractVersion: SALES_PIPELINE_CONTRACT_VERSION,
			},
			orderBy: { salesOrderId: "asc" },
			take: 250,
			...(cursor ? { cursor: { salesOrderId: cursor }, skip: 1 } : {}),
			select: {
				salesOrderId: true,
				orderId: true,
				pipelineRevision: true,
				payload: true,
			},
		});
		queryLatencies.push(performance.now() - queryStartedAt);
		rows.push(...page);
		cursor = page.at(-1)?.salesOrderId;
		if (page.length < 250 || !cursor) break;
	}
	const freshSnapshots = new Map<number, SalesPipelineSnapshot>();
	for (let index = 0; index < rows.length; index += 100) {
		const batch = rows.slice(index, index + 100);
		const queryStartedAt = performance.now();
		const snapshots = await getSalesPipelineSnapshots(
			db,
			batch.map((row) => row.salesOrderId),
		);
		queryLatencies.push(performance.now() - queryStartedAt);
		for (const [salesOrderId, snapshot] of snapshots) {
			freshSnapshots.set(salesOrderId, snapshot);
		}
	}
	const comparisons = rows.flatMap((row) => {
		const payload = record(row.payload);
		const snapshot = freshSnapshots.get(row.salesOrderId);
		if (!snapshot?.revision) return [];
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
		return [
			{
				salesOrderId: row.salesOrderId,
				orderNo: row.orderId,
				staleProjection: row.pipelineRevision !== snapshot.revision,
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
			},
		];
	});
	const membershipDifferences = comparisons.filter(
		(item) => item.membershipClassification,
	);
	const unexplainedMembershipDifferences = membershipDifferences.filter(
		(item) => item.membershipClassification === "unexplained",
	);
	const unsafeDifferences = comparisons.filter((item) => item.unsafe);
	const finishedAt = new Date();
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
		unsafeTransitionDifferences: unsafeDifferences.length,
		headlineDifferences: comparisons.filter((item) =>
			item.differenceCodes.includes("HEADLINE_MISMATCH"),
		).length,
		staleProjectionDifferences: comparisons.filter(
			(item) => item.staleProjection,
		).length,
		p95LatencyMs: percentile95(queryLatencies),
		latencyMeasurement: {
			kind: "paged-db-read-and-fresh-resolver-batch",
			sampleCount: queryLatencies.length,
			pageSize: 250,
			resolverBatchSize: 100,
		},
		conflictSampleComplete: args.has("--conflicts-reviewed"),
		operatorApproved: args.has("--operator-approved"),
		membershipReviewSamples: comparisons
			.filter((item) => item.membershipClassification === "review_required")
			.slice(0, 50),
		samples: comparisons
			.filter((item) => item.differenceCodes.length || item.unsafe)
			.slice(0, 50),
		safety: {
			writesPerformed: false,
			cutoverRequiresSeparateOperatorApproval: true,
		},
	};
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = valueAfter("--output");
	if (outputPath) await writeFile(resolve(outputPath), serialized, "utf8");
	process.stdout.write(serialized);
}

if (import.meta.main) {
	main()
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		})
		.finally(async () => db.$disconnect());
}
