import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	DEFAULT_SALES_REQUEST_AI_SELECTION,
	getSalesRequestAIProviderOption,
	salesRequestAISelectionSchema,
} from "@gnd/settings";
import { PrismaClient } from "@prisma/client";
import {
	buildSalesRequestModelInput,
	evaluateSalesRequestCorpusCase,
	loadSalesRequestCorpus,
} from "../apps/api/src/services/request-generation/evaluation/corpus";
import { getSalesRequestConfigurationContext } from "../apps/api/src/services/sales-request-configuration-context";
import { createSalesRequestProvider } from "../apps/api/src/services/sales-request-generation";

const repositoryRoot = resolve(import.meta.dir, "..");
const corpusRoot = join(
	repositoryRoot,
	".brain/evaluations/sales-request-generation",
);

function argument(name: string) {
	const prefix = `--${name}=`;
	return process.argv
		.slice(2)
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}

function safeSegment(value: string, label: string) {
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
		throw new Error(`Invalid ${label}`);
	}
	return value;
}

function defaultRunId() {
	return new Date()
		.toISOString()
		.replaceAll(":", "")
		.replace(/\.\d{3}Z$/, "Z");
}

function sha256(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

async function writeJson(path: string, value: unknown) {
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

async function main() {
	const live = process.argv.includes("--live");
	const prepareOnly = process.argv.includes("--prepare-only");
	const selectedCaseId = argument("case");
	if (live && prepareOnly) {
		throw new Error("Choose either --live or --prepare-only");
	}
	if (prepareOnly && !selectedCaseId) {
		throw new Error("Input preparation requires exactly one --case=<id>");
	}
	if (live && !selectedCaseId) {
		throw new Error("Live corpus runs require exactly one --case=<id>");
	}
	const settingId = Number(argument("setting-id"));
	if (!Number.isSafeInteger(settingId) || settingId <= 0) {
		throw new Error("Choose an explicit local setting with --setting-id=<id>");
	}

	const databaseUrl = new URL(process.env.DATABASE_URL || "");
	if (
		!["localhost", "127.0.0.1", "::1", "[::1]"].includes(databaseUrl.hostname)
	) {
		throw new Error("Corpus evaluation requires the local database");
	}

	const providerId =
		argument("provider") ?? DEFAULT_SALES_REQUEST_AI_SELECTION.provider;
	const provider =
		salesRequestAISelectionSchema.shape.provider.parse(providerId);
	const selection = salesRequestAISelectionSchema.parse({
		provider,
		model:
			argument("model") ??
			getSalesRequestAIProviderOption(provider).defaultModel,
	});
	const runId = safeSegment(argument("run-id") ?? defaultRunId(), "run ID");
	const cases = await loadSalesRequestCorpus(
		join(corpusRoot, "cases"),
		selectedCaseId,
	);
	const runsDirectory = join(corpusRoot, "runs");
	await mkdir(runsDirectory, { recursive: true });
	const runRoot = join(runsDirectory, runId);
	await mkdir(runRoot);
	const runDirectory = join(
		runRoot,
		selection.provider,
		safeSegment(selection.model, "model"),
	);
	await mkdir(runDirectory, { recursive: true });

	const db = new PrismaClient();
	try {
		const snapshot = await db.$transaction(
			(tx) => getSalesRequestConfigurationContext(tx, { settingId }),
			{ isolationLevel: "RepeatableRead" },
		);
		await writeJson(
			join(runDirectory, "configuration-source.json"),
			snapshot.configuration,
		);
		await writeJson(
			join(runDirectory, "configuration.json"),
			JSON.parse(snapshot.configurationJson),
		);
		await writeJson(join(runDirectory, "manifest.json"), {
			runId,
			mode: prepareOnly ? "prepare-only" : live ? "live" : "mock",
			provider: selection.provider,
			model: selection.model,
			settingId,
			configurationRevision: snapshot.revision,
			configurationSha256: sha256(snapshot.configurationJson),
			startedAt: new Date().toISOString(),
			caseIds: cases.map(({ id }) => id),
			imageEvaluation: "deferred",
			serviceVocabularyRevision: snapshot.serviceVocabularyRevision,
		});

		const liveProvider = live
			? createSalesRequestProvider({ selection })
			: async () => ({
					output: {
						schemaVersion: 2,
						lineItems: [],
						unresolved: [
							{
								lineUid: null,
								stepId: null,
								field: "request",
								status: "unsupported" as const,
								reason: "Mock corpus run",
							},
						],
					},
				});
		const results = [];
		for (const caseData of cases) {
			const caseDirectory = join(runDirectory, caseData.id);
			await mkdir(caseDirectory);
			await writeJson(join(caseDirectory, "request.json"), {
				caseId: caseData.id,
				label: caseData.label,
				language: caseData.language,
				sourceType: caseData.sourceType,
				sanitized: caseData.sanitized,
				inputSha256: caseData.inputSha256,
				text: caseData.text,
			});
			await writeJson(
				join(caseDirectory, "model-input.json"),
				buildSalesRequestModelInput({
					text: caseData.text,
					configurationJson: snapshot.configurationJson,
					configurationRevision: snapshot.revision,
				}),
			);
			if (prepareOnly) continue;
			const result = await evaluateSalesRequestCorpusCase({
				caseData,
				configurationJson: snapshot.configurationJson,
				configurationRevision: snapshot.revision,
				provider: liveProvider,
			});
			await writeJson(
				join(caseDirectory, "provider-output.json"),
				result.providerOutput,
			);
			if (result.status === "ok") {
				await writeJson(join(caseDirectory, "seed.json"), result.seed);
			}
			await writeJson(
				join(caseDirectory, "validation.json"),
				result.validation,
			);
			await writeJson(join(caseDirectory, "metrics.json"), result.metrics);
			await writeFile(
				join(caseDirectory, "review.md"),
				`# Human review: ${caseData.label}\n\nStatus: Pending\n\n## Correct selections\n\nTODO\n\n## Missing or incorrect selections\n\nTODO\n\n## Unsafe guesses\n\nTODO\n`,
				{ flag: "wx" },
			);
			results.push(result);
		}
		await writeJson(join(runDirectory, "summary.json"), {
			runId,
			caseCount: cases.length,
			preparedOnly: prepareOnly,
			successCount: results.filter(({ status }) => status === "ok").length,
			errorCount: results.filter(({ status }) => status === "error").length,
			results: results.map((result) => ({
				caseId: result.caseId,
				status: result.status,
				metrics: result.metrics,
			})),
		});
		console.log(runDirectory);
	} finally {
		await db.$disconnect();
	}
}

main().catch((error) => {
	console.error(
		`[sales-request-corpus] ${error instanceof Error ? error.message : "failed"}`,
	);
	process.exitCode = 1;
});
