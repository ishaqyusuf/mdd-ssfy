import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import {
	DEFAULT_SALES_REQUEST_AI_SELECTION,
	getSalesRequestAIProviderOption,
	salesRequestAISelectionSchema,
} from "@gnd/settings";
import { PrismaClient } from "@prisma/client";
import {
	type SalesRequestEvaluationApprovalArtifacts,
	assertSalesRequestEvaluationApproval,
	consumeSalesRequestEvaluationApproval,
	createSalesRequestEvaluationApprovalPacket,
} from "../apps/api/src/services/request-generation/evaluation/approval";
import {
	buildSalesRequestModelInput,
	evaluateSalesRequestCorpusCase,
	getSalesRequestCorpusOracleCoverage,
	loadSalesRequestCorpus,
} from "../apps/api/src/services/request-generation/evaluation/corpus";
import { getSalesRequestConfigurationContext } from "../apps/api/src/services/sales-request-configuration-context";
import {
	SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
	SALES_REQUEST_MAX_OUTPUT_TOKENS,
	SALES_REQUEST_PROVIDER_TIMEOUT_MS,
	createSalesRequestProvider,
	getSalesRequestProviderRuntimeOptions,
} from "../apps/api/src/services/sales-request-generation";

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
	await writeFile(path, serializeJson(value), { flag: "wx" });
}

function serializeJson(value: unknown) {
	return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(path: string) {
	return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function assertArchivedArtifact(path: string, expected: string) {
	const archived = await readFile(path, "utf8");
	if (archived !== expected) {
		throw new Error(
			`Prepared evaluation artifact changed after review: ${path}`,
		);
	}
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
	const runDirectory = join(
		runRoot,
		selection.provider,
		safeSegment(selection.model, "model"),
	);
	if (!live) {
		await mkdir(runRoot);
		await mkdir(runDirectory, { recursive: true });
	}

	const db = new PrismaClient();
	try {
		const snapshot = await db.$transaction(
			(tx) => getSalesRequestConfigurationContext(tx, { settingId }),
			{ isolationLevel: "RepeatableRead" },
		);
		const configurationSourceJson = serializeJson(snapshot.configuration);
		const configurationJson = serializeJson(
			JSON.parse(snapshot.configurationJson),
		);
		const oracleCoverage = getSalesRequestCorpusOracleCoverage(cases);
		const providerRuntimeOptions = getSalesRequestProviderRuntimeOptions(
			selection.provider,
		);
		const preparedCases = cases.map((caseData) => {
			if (
				(live || prepareOnly) &&
				(!caseData.expectedProviderOutput || !caseData.expectedSeed)
			) {
				throw new Error(
					`Live approval requires provider and seed oracles for ${caseData.id}`,
				);
			}
			const request = {
				caseId: caseData.id,
				label: caseData.label,
				language: caseData.language,
				sourceType: caseData.sourceType,
				sanitized: caseData.sanitized,
				inputSha256: caseData.inputSha256,
				text: caseData.text,
			};
			const modelInput = buildSalesRequestModelInput({
				text: caseData.text,
				configurationJson: snapshot.configurationJson,
				configurationRevision: snapshot.revision,
			});
			return {
				caseData,
				request,
				modelInput,
				serialized: {
					request: serializeJson(request),
					modelInput: serializeJson(modelInput),
					factExpectations: serializeJson(caseData.factExpectations),
					providerOracle: serializeJson(caseData.expectedProviderOutput),
					seedOracle: serializeJson(caseData.expectedSeed),
				},
			};
		});
		const singlePreparedCase = preparedCases[0];
		const approvalPacket =
			live || prepareOnly
				? createSalesRequestEvaluationApprovalPacket({
						runId,
						caseId: singlePreparedCase.caseData.id,
						provider: selection.provider,
						model: selection.model,
						settingId,
						configurationRevision: snapshot.revision,
						promptVersion: SALES_REQUEST_PROMPT_VERSION,
						outputContract: "new-sales-form-seed-v2",
						serviceVocabularyRevision: snapshot.serviceVocabularyRevision,
						maxOutputTokens: SALES_REQUEST_MAX_OUTPUT_TOKENS,
						maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
						providerTimeoutMs: SALES_REQUEST_PROVIDER_TIMEOUT_MS,
						artifacts: {
							configuration: configurationJson,
							configurationSource: configurationSourceJson,
							factExpectations: singlePreparedCase.serialized.factExpectations,
							modelInput: singlePreparedCase.serialized.modelInput,
							providerOracle: singlePreparedCase.serialized.providerOracle,
							providerRuntimeOptions: serializeJson(
								providerRuntimeOptions ?? null,
							),
							request: singlePreparedCase.serialized.request,
							seedOracle: singlePreparedCase.serialized.seedOracle,
						} satisfies SalesRequestEvaluationApprovalArtifacts,
					})
				: null;
		const manifest = {
			runId,
			mode: prepareOnly ? "prepare-only" : "mock",
			provider: selection.provider,
			model: selection.model,
			settingId,
			configurationRevision: snapshot.revision,
			configurationSha256: sha256(snapshot.configurationJson),
			promptVersion: SALES_REQUEST_PROMPT_VERSION,
			outputContract: "new-sales-form-seed-v2",
			startedAt: new Date().toISOString(),
			caseIds: cases.map(({ id }) => id),
			...oracleCoverage,
			imageEvaluation: "deferred",
			serviceVocabularyRevision: snapshot.serviceVocabularyRevision,
			providerRuntimeOptions,
			maxOutputTokens: SALES_REQUEST_MAX_OUTPUT_TOKENS,
			maxRetries:
				live || prepareOnly ? SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES : null,
			providerTimeoutMs: SALES_REQUEST_PROVIDER_TIMEOUT_MS,
			...(approvalPacket
				? { approvalDigest: approvalPacket.approvalDigest }
				: {}),
		};

		if (!live) {
			await writeFile(
				join(runDirectory, "configuration-source.json"),
				configurationSourceJson,
				{ flag: "wx" },
			);
			await writeFile(
				join(runDirectory, "configuration.json"),
				configurationJson,
				{ flag: "wx" },
			);
			await writeJson(join(runDirectory, "manifest.json"), manifest);
			for (const prepared of preparedCases) {
				const caseDirectory = join(runDirectory, prepared.caseData.id);
				await mkdir(caseDirectory);
				await writeFile(
					join(caseDirectory, "request.json"),
					prepared.serialized.request,
					{
						flag: "wx",
					},
				);
				await writeFile(
					join(caseDirectory, "model-input.json"),
					prepared.serialized.modelInput,
					{ flag: "wx" },
				);
				await writeFile(
					join(caseDirectory, "fact-expectations.json"),
					prepared.serialized.factExpectations,
					{ flag: "wx" },
				);
				if (prepared.caseData.expectedProviderOutput) {
					await writeFile(
						join(caseDirectory, "oracle-provider-output.json"),
						prepared.serialized.providerOracle,
						{ flag: "wx" },
					);
				}
				if (prepared.caseData.expectedSeed) {
					await writeFile(
						join(caseDirectory, "oracle-seed.json"),
						prepared.serialized.seedOracle,
						{ flag: "wx" },
					);
				}
			}
			if (approvalPacket) {
				await writeJson(join(runDirectory, "approval.json"), approvalPacket);
			}
		}

		if (prepareOnly) {
			await writeJson(join(runDirectory, "summary.json"), {
				runId,
				caseCount: cases.length,
				preparedOnly: true,
				successCount: 0,
				errorCount: 0,
				results: [],
			});
			console.log(runDirectory);
			console.log(`approvalDigest=${approvalPacket?.approvalDigest}`);
			return;
		}

		let liveProvider = null;
		if (live) {
			if (!approvalPacket) throw new Error("Approval packet is unavailable");
			const caseDirectory = join(runDirectory, singlePreparedCase.caseData.id);
			assertSalesRequestEvaluationApproval({
				archivedPacket: await readJson(join(runDirectory, "approval.json")),
				expectedPacket: approvalPacket,
				approvedDigest: argument("approved-digest"),
			});
			await assertArchivedArtifact(
				join(runDirectory, "configuration-source.json"),
				configurationSourceJson,
			);
			await assertArchivedArtifact(
				join(runDirectory, "configuration.json"),
				configurationJson,
			);
			for (const [name, serialized] of [
				["request.json", singlePreparedCase.serialized.request],
				["model-input.json", singlePreparedCase.serialized.modelInput],
				[
					"fact-expectations.json",
					singlePreparedCase.serialized.factExpectations,
				],
				[
					"oracle-provider-output.json",
					singlePreparedCase.serialized.providerOracle,
				],
				["oracle-seed.json", singlePreparedCase.serialized.seedOracle],
			] as const) {
				await assertArchivedArtifact(join(caseDirectory, name), serialized);
			}
			liveProvider = createSalesRequestProvider({
				selection,
				maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
			});
			await consumeSalesRequestEvaluationApproval({
				path: join(runDirectory, "approval-consumed.json"),
				packet: approvalPacket,
			});
			await writeJson(join(runDirectory, "execution.json"), {
				schemaVersion: 1,
				mode: "live",
				runId,
				provider: selection.provider,
				model: selection.model,
				caseId: singlePreparedCase.caseData.id,
				approvalDigest: approvalPacket.approvalDigest,
				maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
				startedAt: new Date().toISOString(),
			});
		}
		const results = [];
		for (const prepared of preparedCases) {
			const { caseData } = prepared;
			const caseDirectory = join(runDirectory, caseData.id);
			const result = await evaluateSalesRequestCorpusCase({
				caseData,
				configurationJson: snapshot.configurationJson,
				configurationRevision: snapshot.revision,
				provider:
					liveProvider ??
					(async () => ({
						output: caseData.expectedProviderOutput ?? {
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
					})),
			});
			await writeJson(
				join(caseDirectory, "provider-output.json"),
				result.providerOutput,
			);
			if (result.status !== "error") {
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
		await writeJson(
			join(runDirectory, live ? "live-summary.json" : "summary.json"),
			{
				runId,
				caseCount: cases.length,
				preparedOnly: prepareOnly,
				successCount: results.filter(({ status }) => status === "ok").length,
				reviewRequiredCount: results.filter(
					({ status }) => status === "review-required",
				).length,
				errorCount: results.filter(({ status }) => status === "error").length,
				results: results.map((result) => ({
					caseId: result.caseId,
					status: result.status,
					metrics: result.metrics,
				})),
			},
		);
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
