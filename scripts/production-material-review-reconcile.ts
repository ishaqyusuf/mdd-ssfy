import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { userHasPermission } from "@gnd/auth/utils";
import { createDatabaseClient, db } from "@gnd/db";
import { runSalesPipelineCommandTransaction } from "@gnd/sales";
import { getDominantItemMaterialStatusCode } from "@gnd/sales/item-material-status";
import {
	PRODUCTION_MATERIAL_REVIEW_CLASSIFICATION_VERSION,
	type ProductionMaterialReviewRepairOperation,
	applyProductionMaterialReviewHistoryRepair,
	buildProductionMaterialReviewRepairPlan,
	decideProductionSubmissionMaterialReview,
	getProductionSubmissionMaterialReviewDetail,
} from "@gnd/sales/production-submission-review";
import {
	productionMaterialReviewScanOperation,
	readReconciliationInteger,
	runProductionMaterialReviewScan,
} from "./production-material-review-scan";
import {
	type DatabaseRetryOptions,
	runDatabaseCli,
	withDatabaseReadRetry,
} from "./sales-pipeline-database-retry";

const args = new Set(process.argv.slice(2));
const applyHistory = args.has("--apply-history");
const approveReady = args.has("--approve-ready");
const applying = applyHistory || approveReady;
const valueAfter = (flag: string) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
};
const batchSize = Math.min(
	100,
	readReconciliationInteger(process.argv, "--batch-size", 25, 1),
);
const maxMutations = readReconciliationInteger(
	process.argv,
	"--max-mutations",
	Number.POSITIVE_INFINITY,
);
const afterReviewId = readReconciliationInteger(
	process.argv,
	"--after-review-id",
	0,
);
const throughReviewIdValue = readReconciliationInteger(
	process.argv,
	"--through-review-id",
	Number.POSITIVE_INFINITY,
	1,
);
const throughReviewId = Number.isFinite(throughReviewIdValue)
	? throughReviewIdValue
	: null;
const maxCandidatesValue = readReconciliationInteger(
	process.argv,
	"--max-candidates",
	Number.POSITIVE_INFINITY,
	1,
);
const maxCandidates = Number.isFinite(maxCandidatesValue)
	? maxCandidatesValue
	: null;
const actorId = readReconciliationInteger(process.argv, "--actor-id", 0, 1);
const reason = valueAfter("--reason")?.trim();
const outputPath = valueAfter("--output");

type ProductionMaterialReviewReadRetryOptions = DatabaseRetryOptions & {
	resetConnection?: () => Promise<void> | void;
};

let reconciliationDb = db;

async function resetProductionDatabaseConnection() {
	const failedDb = reconciliationDb;
	reconciliationDb = createDatabaseClient();
	void failedDb.$disconnect().catch(() => {
		// The failed client is never reused; cleanup must not block recovery.
	});
}

export async function withProductionMaterialReviewReadRetry<T>(
	operation: () => Promise<T>,
	options: ProductionMaterialReviewReadRetryOptions = {},
) {
	const { resetConnection, ...retryOptions } = options;
	return withDatabaseReadRetry(operation, {
		// Do not accumulate twenty abandoned driver clients during an outage.
		attempts: 3,
		...retryOptions,
		onRetry: async (error, attempt) => {
			if (import.meta.main) {
				const code = (error as { code?: unknown })?.code;
				console.error(
					JSON.stringify({
						event: "read_retry",
						attempt,
						code: typeof code === "string" ? code : "connection_error",
					}),
				);
			}
			await retryOptions.onRetry?.(error, attempt);
			await (resetConnection ?? resetProductionDatabaseConnection)();
		},
	});
}

async function requireAuthorizedActor() {
	if (!actorId || !reason) {
		throw new Error(
			"Mutation mode requires --actor-id and --reason for auditability.",
		);
	}
	if (
		!(await withProductionMaterialReviewReadRetry(() =>
			userHasPermission(reconciliationDb, actorId, "editProduction"),
		))
	) {
		throw new Error("The reconciliation actor cannot edit Production.");
	}
	const actor = await withProductionMaterialReviewReadRetry(() =>
		reconciliationDb.users.findUnique({
			where: { id: actorId },
			select: { id: true, name: true },
		}),
	);
	if (!actor) throw new Error("The reconciliation actor was not found.");
	return { id: actor.id, name: actor.name || `User ${actor.id}` };
}

async function main() {
	const startedAt = new Date();
	const actor = applying ? await requireAuthorizedActor() : null;
	if (throughReviewId != null && throughReviewId <= afterReviewId) {
		throw new Error(
			"--through-review-id must be greater than --after-review-id.",
		);
	}
	const candidateWindow = await withProductionMaterialReviewReadRetry(() =>
		reconciliationDb.salesProductionSubmissionMaterialReview.findMany({
			where: {
				status: "PENDING",
				id:
					afterReviewId > 0 || throughReviewId != null
						? {
								...(afterReviewId > 0 ? { gt: afterReviewId } : {}),
								...(throughReviewId != null ? { lte: throughReviewId } : {}),
							}
						: undefined,
			},
			orderBy: { id: "asc" },
			take: maxCandidates == null ? undefined : maxCandidates + 1,
			select: {
				id: true,
				updatedAt: true,
				classificationReason: true,
				submittedAt: true,
			},
		}),
	);
	const hasMoreCandidates =
		maxCandidates != null && candidateWindow.length > maxCandidates;
	const candidates =
		maxCandidates == null
			? candidateWindow
			: candidateWindow.slice(0, maxCandidates);
	console.error(
		JSON.stringify({
			event: "scan_started",
			mode: applying ? "apply" : "dry-run",
			candidateCount: candidates.length,
		}),
	);
	const rows: Array<{
		reviewId: number;
		orderNo: string | null;
		orderId: number | null;
		ageDays: number | null;
		classification: string;
		classificationVersion: string;
		storedReason: string | null;
		currentReason: string | null;
		materialStatus: string;
		materialRevision: string | null;
		pipelineRevision: string | null;
		operation: ProductionMaterialReviewRepairOperation | "unsafe";
		changed: boolean;
		error: string | null;
	}> = [];
	const { mutationCount, stopReason, lastSuccessfulReviewId } =
		await runProductionMaterialReviewScan({
			candidates,
			maxMutations,
			load: async (candidate) => {
				const readStartedAt = Date.now();
				console.error(
					JSON.stringify({
						event: "review_read_started",
						reviewId: candidate.id,
					}),
				);
				const detail = await withProductionMaterialReviewReadRetry(() =>
					getProductionSubmissionMaterialReviewDetail(
						reconciliationDb,
						candidate.id,
					),
				);
				console.error(
					JSON.stringify({
						event: "review_read_completed",
						reviewId: candidate.id,
						elapsedMs: Date.now() - readStartedAt,
					}),
				);
				const materialStatus = getDominantItemMaterialStatusCode(
					detail.currentEvidence.itemMaterialStatuses.map(
						(status) => status.code,
					),
				);
				const plan = buildProductionMaterialReviewRepairPlan({
					actionability: detail.actionability,
					materialStatus,
					storedReason: candidate.classificationReason,
				});
				const operation = productionMaterialReviewScanOperation(plan);
				const operationEnabled =
					(plan.operation === "approve_ready" && approveReady) ||
					(plan.operation !== "approve_ready" &&
						plan.operation !== "none" &&
						applyHistory);
				const row: (typeof rows)[number] = {
					reviewId: candidate.id,
					orderNo: detail.order.orderId,
					orderId: detail.order.id,
					ageDays: Math.floor(
						(startedAt.getTime() - candidate.submittedAt.getTime()) /
							86_400_000,
					),
					classification: plan.classification,
					classificationVersion: plan.classificationVersion,
					storedReason: candidate.classificationReason,
					currentReason: plan.currentReason,
					materialStatus,
					materialRevision: detail.currentEvidence.materialRevision,
					pipelineRevision: detail.pipelineRevision,
					operation,
					changed: false,
					error: null,
				};
				rows.push(row);
				return {
					operation,
					enabled: operationEnabled,
					apply: async () => {
						if (!actor || !reason)
							throw new Error("Mutation actor and reason are required.");
						if (plan.operation === "approve_ready") {
							const execution = await runSalesPipelineCommandTransaction(
								reconciliationDb,
								{
									salesOrderId: detail.order.id,
									action: "production.review.resolve",
									authorized: true,
									expectedRevision: detail.pipelineRevision,
									enforce: true,
									executeOnReplay: true,
									retryOnWriteConflict: false,
									operation:
										"reconciliation.production-material-review.approve",
								},
								(transactionDb) =>
									decideProductionSubmissionMaterialReview(
										transactionDb,
										{
											reviewId: candidate.id,
											expectedUpdatedAt: candidate.updatedAt,
											pipelineRevision: detail.pipelineRevision || undefined,
											action: "RECHECK_AND_APPROVE",
											note: reason,
										},
										actor,
									),
							);
							row.changed =
								execution.executed && execution.value.status === "APPROVED";
						} else {
							if (!detail.currentEvidence.materialRevision) {
								throw new Error(
									"Material revision is unavailable; re-audit before repairing history.",
								);
							}
							const repair = await applyProductionMaterialReviewHistoryRepair(
								reconciliationDb,
								{
									reviewId: candidate.id,
									expectedUpdatedAt: candidate.updatedAt,
									plan,
									actor,
									reason,
									materialSnapshot: detail.currentEvidence.materialSnapshot,
									materialRevision: detail.currentEvidence.materialRevision,
								},
							);
							row.changed = repair.changed;
						}
						return row.changed;
					},
				};
			},
			onFailure: (candidate, phase, caught) => {
				const error = caught instanceof Error ? caught.message : String(caught);
				if (phase === "mutation") {
					const row = rows.at(-1);
					if (row) row.error = error;
					return;
				}
				rows.push({
					reviewId: candidate.id,
					orderNo: null,
					orderId: null,
					ageDays: null,
					classification: "unsafe",
					classificationVersion: PRODUCTION_MATERIAL_REVIEW_CLASSIFICATION_VERSION,
					storedReason: candidate.classificationReason,
					currentReason: null,
					materialStatus: "status_unknown",
					materialRevision: null,
					pipelineRevision: null,
					operation: "unsafe",
					changed: false,
					error,
				});
			},
		});
	const countBy = (key: "classification" | "operation") =>
		Object.fromEntries(
			Array.from(new Set(rows.map((row) => row[key]))).map((value) => [
				value,
				rows.filter((row) => row[key] === value).length,
			]),
		);
	const finishedAt = new Date();
	const report = {
		contract: "production-material-review-reconciliation/v1",
		mode: applying ? "apply" : "dry-run",
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		latencyMs: finishedAt.getTime() - startedAt.getTime(),
		batchSize,
		actorId: actor?.id ?? null,
		reason: reason ?? null,
		candidateCount: candidates.length,
		candidateWindow: {
			afterReviewId,
			throughReviewId,
			maxCandidates,
			firstReviewId: candidates.at(0)?.id ?? null,
			lastReviewId: candidates.at(-1)?.id ?? null,
			hasMoreCandidates,
		},
		processedCandidateCount: rows.length,
		lastSuccessfulReviewId,
		mutationCount,
		stoppedEarly: stopReason !== null,
		stopReason,
		classifications: countBy("classification"),
		proposedOperations: countBy("operation"),
		failures: rows.filter((row) => row.error).length,
		archetypes: ["09086PC", "09176PC", "09178DB"].map((orderNo) => ({
			orderNo,
			rows: rows.filter((row) => row.orderNo === orderNo),
		})),
		samples: rows.filter((row) => row.operation !== "none").slice(0, 25),
		safety: {
			applyHistory:
				"Cancels only terminal/empty pending reviews or reclassifies their derived reason with optimistic revision checks; it never changes inventory, submissions, payroll, packing, dispatch, payment, or accounting facts.",
			approveReady:
				"Uses the existing audited review decision transaction and is separately gated by --approve-ready.",
			productionRule:
				"A production dry-run packet must be separately approved before either mutation flag is used against production.",
			stopRules: [
				"Stop on any unsafe classification or mutation failure.",
				"Stop when a revision changes before mutation.",
				"Use --max-mutations for bounded cohorts and verify convergence between batches.",
			],
		},
	};
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	if (outputPath) await writeFile(resolve(outputPath), serialized, "utf8");
	process.stdout.write(serialized);
	if (report.failures > 0 || report.stoppedEarly) process.exitCode = 1;
}

if (import.meta.main) {
	await runDatabaseCli(main, () => reconciliationDb.$disconnect());
}
