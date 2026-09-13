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
import {
	calculateSalesRequestEvaluationCost,
	salesRequestEvaluationPricingSnapshotSchema,
} from "../apps/api/src/services/request-generation/evaluation/pricing";
import { getSalesRequestConfigurationContext } from "../apps/api/src/services/sales-request-configuration-context";
import {
	SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
	SALES_REQUEST_MAX_OUTPUT_TOKENS,
	SALES_REQUEST_PROVIDER_TIMEOUT_MS,
	createSalesRequestProvider,
	getSalesRequestProviderRuntimeOptions,
} from "../apps/api/src/services/sales-request-generation";
import type { SalesRequestProvider } from "../apps/api/src/services/sales-request-provider";

const repositoryRoot = resolve(import.meta.dir, "..");
const corpusRoot = join(
	repositoryRoot,
	".brain/evaluations/sales-request-generation",
);
const pricingRoot = join(corpusRoot, "pricing");
const evaluationRuntimeFiles = [
	"apps/api/src/services/request-generation/evaluation/approval.ts",
	"apps/api/src/services/request-generation/evaluation/benchmark-evidence.ts",
	"apps/api/src/services/request-generation/evaluation/corpus.ts",
	"apps/api/src/services/request-generation/evaluation/harness.ts",
	"apps/api/src/services/request-generation/evaluation/pricing.ts",
	"apps/api/src/services/sales-request-generation.ts",
	"apps/api/src/services/sales-request-provider.ts",
	"packages/sales/src/sales-form/request-generation/index.ts",
	"packages/sales/src/sales-form/request-generation/prompt.ts",
	"scripts/finalize-sales-request-benchmark.ts",
	"scripts/run-sales-request-corpus.ts",
	"bun.lock",
] as const;

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

function approvalSummary(
	packet: NonNullable<
		ReturnType<typeof createSalesRequestEvaluationApprovalPacket>
	>,
	artifacts: SalesRequestEvaluationApprovalArtifacts,
) {
	const scope = packet.scope;
	const command = [
		"bun --env-file=.env.local scripts/run-sales-request-corpus.ts",
		"--live",
		`--case=${scope.caseId}`,
		`--setting-id=${scope.settingId}`,
		`--provider=${scope.provider}`,
		`--model=${scope.model}`,
		`--run-id=${scope.runId}`,
		`--pricing-date=${scope.pricingEffectiveAt}`,
		`--approved-digest=${packet.approvalDigest}`,
	].join(" ");
	return [
		`# Sales Request benchmark approval: ${scope.caseId}`,
		"",
		`- Provider/model: \`${scope.provider}/${scope.model}\``,
		`- Configuration: \`${scope.configurationRevision}\``,
		`- Prompt/output: \`${scope.promptVersion}/${scope.outputContract}\``,
		`- Maximum output tokens: ${scope.maxOutputTokens}`,
		`- Retries: ${scope.maxRetries}`,
		`- Timeout: ${scope.providerTimeoutMs} ms`,
		`- Conservative cost ceiling: ${scope.maxEstimatedCallCostMicros} micro-${scope.pricingCurrency}`,
		`- Pricing effective: ${scope.pricingEffectiveAt}`,
		`- Pricing evidence: \`${scope.pricingSourceDigest}\``,
		`- Approval digest: \`${packet.approvalDigest}\``,
		"- Image evaluation: deferred",
		"",
		"## Bound artifacts",
		"",
		...Object.entries(artifacts)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(
				([name, value]) =>
					`- ${name}: ${Buffer.byteLength(value, "utf8")} bytes, \`${packet.artifactSha256[name as keyof typeof packet.artifactSha256]}\``,
			),
		"",
		"## Exact one-call command",
		"",
		"```sh",
		command,
		"```",
		"",
	].join("\n");
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

async function buildEvaluationRuntimeLock() {
	const files = await Promise.all(
		evaluationRuntimeFiles.map(async (path) => ({
			path,
			sha256: sha256(await readFile(join(repositoryRoot, path), "utf8")),
		})),
	);
	return serializeJson({ schemaVersion: 1, files });
}

async function readPricingSnapshot(input: {
	provider: string;
	model: string;
	pricingDate: string | undefined;
}) {
	if (!input.pricingDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.pricingDate)) {
		throw new Error(
			"Prepare/live evaluation requires --pricing-date=YYYY-MM-DD",
		);
	}
	const directory = join(
		pricingRoot,
		safeSegment(input.provider, "pricing provider"),
		safeSegment(input.model, "pricing model"),
	);
	const snapshotPath = join(directory, `${input.pricingDate}.json`);
	const sourcePath = join(directory, `${input.pricingDate}.source.md`);
	const source = await readFile(sourcePath, "utf8");
	const snapshot = salesRequestEvaluationPricingSnapshotSchema.parse(
		JSON.parse(await readFile(snapshotPath, "utf8")),
	);
	if (
		snapshot.provider !== input.provider ||
		snapshot.model !== input.model ||
		snapshot.effectiveAt !== input.pricingDate ||
		snapshot.sourceDigest !== `sha256:${sha256(source)}`
	) {
		throw new Error(
			"Pricing snapshot does not match its provider, model, date, or source evidence.",
		);
	}
	return {
		snapshot,
		serializedSnapshot: serializeJson(snapshot),
		source,
	};
}

function requirePricing(
	pricing: Awaited<ReturnType<typeof readPricingSnapshot>> | null,
) {
	if (!pricing) throw new Error("Evaluation pricing is unavailable");
	return pricing;
}

function requireApprovalArtifacts(
	artifacts: SalesRequestEvaluationApprovalArtifacts | null,
) {
	if (!artifacts)
		throw new Error("Evaluation approval artifacts are unavailable");
	return artifacts;
}

function resultTokenUsage(
	result: Awaited<ReturnType<typeof evaluateSalesRequestCorpusCase>>,
) {
	if (result.status === "error") {
		return {
			inputTokens: result.metrics.providerFailure?.inputTokens ?? null,
			outputTokens: result.metrics.providerFailure?.outputTokens ?? null,
		};
	}
	return {
		inputTokens: result.metrics.inputTokens,
		outputTokens: result.metrics.outputTokens,
	};
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
	const pricing =
		live || prepareOnly
			? await readPricingSnapshot({
					provider: selection.provider,
					model: selection.model,
					pricingDate: argument("pricing-date"),
				})
			: null;
	const evaluationRuntimeLock = await buildEvaluationRuntimeLock();
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
		const approvalArtifacts =
			live || prepareOnly
				? ({
						configuration: configurationJson,
						configurationSource: configurationSourceJson,
						factExpectations: singlePreparedCase.serialized.factExpectations,
						modelInput: singlePreparedCase.serialized.modelInput,
						evaluationRuntimeLock,
						pricingSnapshot: requirePricing(pricing).serializedSnapshot,
						pricingSource: requirePricing(pricing).source,
						providerOracle: singlePreparedCase.serialized.providerOracle,
						providerRuntimeOptions: serializeJson(
							providerRuntimeOptions ?? null,
						),
						request: singlePreparedCase.serialized.request,
						seedOracle: singlePreparedCase.serialized.seedOracle,
					} satisfies SalesRequestEvaluationApprovalArtifacts)
				: null;
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
						pricingSnapshot: requirePricing(pricing).snapshot,
						artifacts: requireApprovalArtifacts(approvalArtifacts),
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
			...(pricing ? { pricing: pricing.snapshot } : {}),
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
			await writeFile(
				join(runDirectory, "evaluation-runtime-lock.json"),
				evaluationRuntimeLock,
				{ flag: "wx" },
			);
			await writeFile(
				join(runDirectory, "provider-runtime-options.json"),
				serializeJson(providerRuntimeOptions ?? null),
				{ flag: "wx" },
			);
			if (pricing) {
				await writeFile(
					join(runDirectory, "pricing-snapshot.json"),
					pricing.serializedSnapshot,
					{ flag: "wx" },
				);
				await writeFile(
					join(runDirectory, "pricing-source.md"),
					pricing.source,
					{ flag: "wx" },
				);
			}
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
				await writeFile(
					join(runDirectory, "approval-summary.md"),
					approvalSummary(
						approvalPacket,
						requireApprovalArtifacts(approvalArtifacts),
					),
					{ flag: "wx" },
				);
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

		let liveProvider: SalesRequestProvider | null = null;
		if (live) {
			if (!approvalPacket) throw new Error("Approval packet is unavailable");
			const caseDirectory = join(runDirectory, singlePreparedCase.caseData.id);
			assertSalesRequestEvaluationApproval({
				archivedPacket: await readJson(join(runDirectory, "approval.json")),
				expectedPacket: approvalPacket,
				approvedDigest: argument("approved-digest"),
			});
			await assertArchivedArtifact(
				join(runDirectory, "approval-summary.md"),
				approvalSummary(
					approvalPacket,
					requireApprovalArtifacts(approvalArtifacts),
				),
			);
			await assertArchivedArtifact(
				join(runDirectory, "configuration-source.json"),
				configurationSourceJson,
			);
			await assertArchivedArtifact(
				join(runDirectory, "configuration.json"),
				configurationJson,
			);
			await assertArchivedArtifact(
				join(runDirectory, "evaluation-runtime-lock.json"),
				evaluationRuntimeLock,
			);
			await assertArchivedArtifact(
				join(runDirectory, "provider-runtime-options.json"),
				serializeJson(providerRuntimeOptions ?? null),
			);
			await assertArchivedArtifact(
				join(runDirectory, "pricing-snapshot.json"),
				requirePricing(pricing).serializedSnapshot,
			);
			await assertArchivedArtifact(
				join(runDirectory, "pricing-source.md"),
				requirePricing(pricing).source,
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
			const rawProvider = createSalesRequestProvider({
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
			liveProvider = async (request) => {
				const result = await rawProvider(request);
				await writeJson(
					join(
						runDirectory,
						singlePreparedCase.caseData.id,
						"provider-return.json",
					),
					{
						schemaVersion: 1,
						receivedAt: new Date().toISOString(),
						provider: result.provider,
						model: result.model,
						inputTokens: result.inputTokens ?? null,
						outputTokens: result.outputTokens ?? null,
						output: result.output,
					},
				);
				return result;
			};
		}
		const results = [];
		const costs = [];
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
			const cost = pricing
				? calculateSalesRequestEvaluationCost({
						pricingSnapshot: pricing.snapshot,
						usage: resultTokenUsage(result),
					})
				: null;
			if (cost) {
				await writeJson(join(caseDirectory, "cost-estimate.json"), cost);
				costs.push({ caseId: caseData.id, cost });
			}
			await writeJson(join(caseDirectory, "review-template.json"), {
				schemaVersion: 1,
				status: "pending",
				runId,
				caseId: caseData.id,
				provider: selection.provider,
				model: selection.model,
				reviewerUserId: null,
				reviewedAt: null,
				decision: null,
				factReviews: caseData.factExpectations.facts.map(({ id }) => ({
					factId: id,
					provider: "not-reviewed",
					normalized: "not-reviewed",
					safety: "not-reviewed",
				})),
				correction: {
					method: null,
					durationMs: null,
					changedFieldCategories: [],
				},
				nativeSaveReopen: null,
				stopReasons: [],
			});
			await writeFile(
				join(caseDirectory, "review.md"),
				`# Human review: ${caseData.label}\n\nStatus: Pending\n\nCopy \`review-template.json\` to \`review.json\`, complete every bounded field, then run the offline finalizer. Do not add request text, customer contacts, credentials, or free-text notes.\n`,
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
				costs,
			},
		);
		console.log(runDirectory);
		if (
			live &&
			(results.some(({ status }) => status !== "ok") ||
				costs.some(
					({ cost }) => !cost.evaluable || cost.withinCeiling !== true,
				))
		) {
			process.exitCode = 2;
		}
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
