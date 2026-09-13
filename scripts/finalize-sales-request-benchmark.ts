import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { salesRequestEvaluationApprovalPacketSchema } from "../apps/api/src/services/request-generation/evaluation/approval";
import {
	finalizeSalesRequestBenchmarkEvidence,
	salesRequestBenchmarkHumanReviewSchema,
	verifySalesRequestBenchmarkFinalEvidence,
} from "../apps/api/src/services/request-generation/evaluation/benchmark-evidence";

const repositoryRoot = resolve(import.meta.dir, "..");
const runsRoot = join(
	repositoryRoot,
	".brain/evaluations/sales-request-generation/runs",
);

const rootArtifacts = [
	"approval.json",
	"approval-summary.md",
	"approval-consumed.json",
	"configuration.json",
	"configuration-source.json",
	"evaluation-runtime-lock.json",
	"execution.json",
	"live-summary.json",
	"manifest.json",
	"pricing-snapshot.json",
	"pricing-source.md",
	"provider-runtime-options.json",
] as const;

const caseArtifacts = [
	"cost-estimate.json",
	"fact-expectations.json",
	"metrics.json",
	"model-input.json",
	"oracle-provider-output.json",
	"oracle-seed.json",
	"provider-output.json",
	"request.json",
	"review.json",
	"review-template.json",
	"validation.json",
] as const;

function argument(name: string) {
	const prefix = `--${name}=`;
	return process.argv
		.slice(2)
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}

function safeSegment(value: string | undefined, label: string) {
	if (!value || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
		throw new Error(`Choose a valid --${label}= value`);
	}
	return value;
}

async function readRequired(path: string) {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if ((error as { code?: string }).code === "ENOENT") {
			throw new Error(`Missing benchmark artifact: ${path}`);
		}
		throw error;
	}
}

async function readOptional(path: string) {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if ((error as { code?: string }).code === "ENOENT") return null;
		throw error;
	}
}

function renderReview(value: unknown) {
	const review = salesRequestBenchmarkHumanReviewSchema.parse(value);
	const counts = review.factReviews.reduce(
		(total, fact) => {
			total.provider[fact.provider] += 1;
			total.normalized[fact.normalized] += 1;
			if (fact.safety === "unsafe") total.unsafe += 1;
			return total;
		},
		{
			provider: { correct: 0, incorrect: 0, "not-produced": 0 },
			normalized: { correct: 0, incorrect: 0, "not-produced": 0 },
			unsafe: 0,
		},
	);
	return [
		`# Final benchmark review: ${review.caseId}`,
		"",
		`- Run: \`${review.runId}\``,
		`- Provider/model: \`${review.provider}/${review.model}\``,
		`- Reviewer user ID: ${review.reviewerUserId}`,
		`- Reviewed at: ${review.reviewedAt}`,
		`- Decision: **${review.decision}**`,
		`- Provider facts: ${counts.provider.correct} correct, ${counts.provider.incorrect} incorrect, ${counts.provider["not-produced"]} not produced`,
		`- Normalized facts: ${counts.normalized.correct} correct, ${counts.normalized.incorrect} incorrect, ${counts.normalized["not-produced"]} not produced`,
		`- Unsafe facts: ${counts.unsafe}`,
		`- Correction: ${review.correction.method}, ${review.correction.durationMs} ms`,
		`- Native save/reopen: ${review.nativeSaveReopen}`,
		`- Stop reasons: ${review.stopReasons.join(", ") || "none"}`,
		"",
	].join("\n");
}

async function collectArtifacts(input: {
	runDirectory: string;
	caseId: string;
	reviewFinal?: string;
}) {
	const artifacts: Record<string, string> = {};
	for (const name of rootArtifacts) {
		artifacts[name] = await readRequired(join(input.runDirectory, name));
	}
	for (const name of caseArtifacts) {
		artifacts[`${input.caseId}/${name}`] = await readRequired(
			join(input.runDirectory, input.caseId, name),
		);
	}
	const seed = await readOptional(
		join(input.runDirectory, input.caseId, "seed.json"),
	);
	if (seed !== null) artifacts[`${input.caseId}/seed.json`] = seed;
	const providerReturn = await readOptional(
		join(input.runDirectory, input.caseId, "provider-return.json"),
	);
	if (providerReturn !== null) {
		artifacts[`${input.caseId}/provider-return.json`] = providerReturn;
	}
	const reviewFinal =
		input.reviewFinal ??
		(await readOptional(
			join(input.runDirectory, input.caseId, "review-final.md"),
		));
	if (reviewFinal !== null && reviewFinal !== undefined) {
		artifacts[`${input.caseId}/review-final.md`] = reviewFinal;
	}
	return artifacts;
}

async function main() {
	const runId = safeSegment(argument("run-id"), "run-id");
	const provider = safeSegment(argument("provider"), "provider");
	const model = safeSegment(argument("model"), "model");
	const runDirectory = join(runsRoot, runId, provider, model);
	const approval = salesRequestEvaluationApprovalPacketSchema.parse(
		JSON.parse(await readRequired(join(runDirectory, "approval.json"))),
	);
	if (
		approval.scope.runId !== runId ||
		approval.scope.provider !== provider ||
		approval.scope.model !== model
	) {
		throw new Error("Run path does not match the approved evaluation identity");
	}
	const caseId = approval.scope.caseId;
	const finalEvidencePath = join(runDirectory, "final-evidence.json");

	if (process.argv.includes("--verify")) {
		const artifacts = await collectArtifacts({ runDirectory, caseId });
		const evidence = verifySalesRequestBenchmarkFinalEvidence({
			artifacts,
			finalEvidence: JSON.parse(await readRequired(finalEvidencePath)),
		});
		console.log(`verified=${evidence.evidenceDigest}`);
		return;
	}

	const reviewValue = JSON.parse(
		await readRequired(join(runDirectory, caseId, "review.json")),
	);
	const reviewFinal = renderReview(reviewValue);
	const artifacts = await collectArtifacts({
		runDirectory,
		caseId,
		reviewFinal,
	});
	const evidence = finalizeSalesRequestBenchmarkEvidence({ artifacts });
	await writeFile(join(runDirectory, caseId, "review-final.md"), reviewFinal, {
		flag: "wx",
	});
	await writeFile(finalEvidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
		flag: "wx",
	});
	console.log(finalEvidencePath);
	console.log(`evidenceDigest=${evidence.evidenceDigest}`);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(
			`[sales-request-benchmark-finalize] ${error instanceof Error ? error.message : "failed"}`,
		);
		process.exitCode = 1;
	});
}
