import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { userHasPermission } from "@gnd/auth/utils";
import { db } from "@gnd/db";
import { getDominantItemMaterialStatusCode } from "@gnd/sales/item-material-status";
import {
	applyProductionMaterialReviewHistoryRepair,
	buildProductionMaterialReviewRepairPlan,
	decideProductionSubmissionMaterialReview,
	getProductionSubmissionMaterialReviewDetail,
	type ProductionMaterialReviewRepairOperation,
} from "@gnd/sales/production-submission-review";

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
	Math.max(1, Number(valueAfter("--batch-size") || 25)),
);
const maxMutations = Math.max(
	0,
	Number(valueAfter("--max-mutations") || Number.POSITIVE_INFINITY),
);
const actorId = Number(valueAfter("--actor-id") || 0);
const reason = valueAfter("--reason")?.trim();
const outputPath = valueAfter("--output");

async function requireAuthorizedActor() {
	if (!actorId || !reason) {
		throw new Error(
			"Mutation mode requires --actor-id and --reason for auditability.",
		);
	}
	if (!(await userHasPermission(db, actorId, "editProduction"))) {
		throw new Error("The reconciliation actor cannot edit Production.");
	}
	const actor = await db.users.findUnique({
		where: { id: actorId },
		select: { id: true, name: true },
	});
	if (!actor) throw new Error("The reconciliation actor was not found.");
	return { id: actor.id, name: actor.name || `User ${actor.id}` };
}

async function main() {
	const startedAt = new Date();
	const actor = applying ? await requireAuthorizedActor() : null;
	const candidates = await db.salesProductionSubmissionMaterialReview.findMany({
		where: { status: "PENDING" },
		orderBy: { id: "asc" },
		select: {
			id: true,
			updatedAt: true,
			classificationReason: true,
			submittedAt: true,
		},
	});
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
	let mutationCount = 0;
	for (let index = 0; index < candidates.length; index += batchSize) {
		const batch = candidates.slice(index, index + batchSize);
		const details = await Promise.allSettled(
			batch.map((candidate) =>
				getProductionSubmissionMaterialReviewDetail(db, candidate.id),
			),
		);
		for (const [detailIndex, result] of details.entries()) {
			const candidate = batch[detailIndex];
			if (!candidate) continue;
			if (result.status === "rejected") {
				rows.push({
					reviewId: candidate.id,
					orderNo: null,
					orderId: null,
					ageDays: null,
					classification: "unsafe",
					classificationVersion: "production-material-review/v1",
					storedReason: candidate.classificationReason,
					currentReason: null,
					materialStatus: "status_unknown",
					materialRevision: null,
					pipelineRevision: null,
					operation: "unsafe",
					changed: false,
					error:
						result.reason instanceof Error
							? result.reason.message
							: String(result.reason),
				});
				continue;
			}
			const detail = result.value;
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
			let changed = false;
			let error: string | null = null;
			const operationEnabled =
				(plan.operation === "approve_ready" && approveReady) ||
				(plan.operation !== "approve_ready" &&
					plan.operation !== "none" &&
					applyHistory);
			if (operationEnabled && mutationCount < maxMutations && actor && reason) {
				try {
					if (plan.operation === "approve_ready") {
						const decision = await decideProductionSubmissionMaterialReview(
							db,
							{
								reviewId: candidate.id,
								expectedUpdatedAt: candidate.updatedAt,
								pipelineRevision: detail.pipelineRevision || undefined,
								action: "RECHECK_AND_APPROVE",
								note: reason,
							},
							actor,
						);
						changed = decision.status === "APPROVED";
					} else {
						const repair = await applyProductionMaterialReviewHistoryRepair(db, {
							reviewId: candidate.id,
							expectedUpdatedAt: candidate.updatedAt,
							plan,
							actor,
							reason,
							materialSnapshot: detail.currentEvidence.materialSnapshot,
							materialRevision: detail.currentEvidence.materialRevision,
						});
						changed = repair.changed;
					}
					if (changed) mutationCount += 1;
				} catch (caught) {
					error = caught instanceof Error ? caught.message : String(caught);
				}
			}
			rows.push({
				reviewId: candidate.id,
				orderNo: detail.order.orderId,
				orderId: detail.order.id,
				ageDays: Math.floor(
					(startedAt.getTime() - candidate.submittedAt.getTime()) / 86_400_000,
				),
				classification: plan.classification,
				classificationVersion: plan.classificationVersion,
				storedReason: candidate.classificationReason,
				currentReason: plan.currentReason,
				materialStatus,
				materialRevision: detail.currentEvidence.materialRevision,
				pipelineRevision: detail.pipelineRevision,
				operation: plan.operation,
				changed,
				error,
			});
		}
	}
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
		mutationCount,
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
	if (report.failures > 0) process.exitCode = 1;
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
