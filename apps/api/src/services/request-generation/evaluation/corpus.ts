import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
	type NewSalesFormSeed,
	type WorkflowComponentRecord,
	type WorkflowRouteData,
	hydrateSalesFormRecord,
	initializeNewSalesFormSeed,
	newSalesFormSeedV2Schema,
	toSalesFormSaveDraftPayload,
} from "@gnd/sales/sales-form-core";
import {
	SALES_REQUEST_PROMPT_VERSION,
	buildSalesRequestInstructions,
} from "@gnd/sales/sales-form/request-generation";
import { z } from "zod";
import { generateNewSalesFormSeed } from "../../sales-request-generation";
import {
	type SalesRequestProvider,
	SalesRequestProviderExecutionError,
	type SalesRequestProviderFailureDiagnostic,
} from "../../sales-request-provider";
import { type EvaluationMetrics, scoreNewSalesFormSeed } from "./harness";

const caseMetadataSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		label: z.string().trim().min(1).max(160),
		language: z.enum(["en", "es", "mixed"]),
		sourceType: z.enum(["email", "pasted-text"]),
		sanitized: z.literal(true),
	})
	.strict();

const configurationLockSchema = z
	.object({
		configurationRevision: z.string().regex(/^[a-f0-9]{64}$/),
		configurationSha256: z.string().regex(/^[a-f0-9]{64}$/),
		promptVersion: z.string().trim().min(1).max(128),
		outputContract: z.literal("new-sales-form-seed-v2"),
	})
	.strict();

const factValueExpectationSchema = z
	.object({
		path: z
			.string()
			.regex(/^[A-Za-z][A-Za-z0-9]*(?:\[\d+\]|\.[A-Za-z][A-Za-z0-9]*)*$/),
		value: z.unknown(),
	})
	.strict();

const factExpectationSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		family: z.enum([
			"door-hpt",
			"mouldings",
			"services",
			"delivery",
			"custom-value",
		]),
		classification: z.enum(["supported", "ambiguous", "custom", "unsupported"]),
		description: z.string().trim().min(1).max(500),
		provider: factValueExpectationSchema,
		seed: factValueExpectationSchema,
	})
	.strict();

export const salesRequestCorpusFactExpectationsSchema = z
	.object({
		shelfItemsExcluded: z.literal(true),
		facts: z.array(factExpectationSchema).min(1).max(500),
	})
	.strict()
	.superRefine((expectations, context) => {
		const ids = new Set<string>();
		for (const [index, fact] of expectations.facts.entries()) {
			if (ids.has(fact.id)) {
				context.addIssue({
					code: "custom",
					message: "Duplicate fact expectation ID",
					path: ["facts", index, "id"],
				});
			}
			ids.add(fact.id);
			const paths = [fact.provider.path, fact.seed.path];
			if (
				fact.classification === "supported" &&
				paths.some((path) => path.startsWith("unresolved["))
			) {
				context.addIssue({
					code: "custom",
					message: "Supported facts cannot resolve through unresolved entries",
					path: ["facts", index],
				});
			}
			if (
				(fact.classification === "ambiguous" ||
					fact.classification === "unsupported") &&
				paths.some((path) => !path.startsWith("unresolved["))
			) {
				context.addIssue({
					code: "custom",
					message:
						"Ambiguous and unsupported facts must resolve through unresolved entries",
					path: ["facts", index],
				});
			}
		}
	});

export type SalesRequestCorpusConfigurationLock = z.infer<
	typeof configurationLockSchema
>;
export type SalesRequestCorpusFactExpectations = z.infer<
	typeof salesRequestCorpusFactExpectationsSchema
>;

type SalesRequestFactMetricBucket = {
	expected: number;
	matched: number;
	matchRate: number | null;
};

export type SalesRequestFactStageMetrics = {
	all: SalesRequestFactMetricBucket;
	supportedAccuracy: SalesRequestFactMetricBucket;
	ambiguousUnsupportedContainment: SalesRequestFactMetricBucket;
	byClassification: Record<
		"supported" | "ambiguous" | "custom" | "unsupported",
		SalesRequestFactMetricBucket
	>;
	byFamily: Record<
		"door-hpt" | "mouldings" | "services" | "delivery" | "custom-value",
		SalesRequestFactMetricBucket
	>;
};

export type SalesRequestCorpusCase = z.infer<typeof caseMetadataSchema> & {
	text: string;
	inputSha256: string;
	configurationLock: SalesRequestCorpusConfigurationLock;
	factExpectations: SalesRequestCorpusFactExpectations;
	expectedProviderOutput?: NewSalesFormSeed;
	expectedSeed?: NewSalesFormSeed;
};

export function getSalesRequestCorpusOracleCoverage(
	cases: SalesRequestCorpusCase[],
) {
	return {
		providerOracleCaseIds: cases
			.filter(({ expectedProviderOutput }) => Boolean(expectedProviderOutput))
			.map(({ id }) => id),
		seedOracleCaseIds: cases
			.filter(({ expectedSeed }) => Boolean(expectedSeed))
			.map(({ id }) => id),
	};
}

export type SalesRequestCorpusCaseResult =
	| {
			status: "ok" | "review-required";
			caseId: string;
			providerOutput: unknown;
			seed: unknown;
			validation: {
				status: "passed" | "review-required";
				facts: "passed" | "failed";
				normalization: "passed";
				initializer: "passed" | "blocked";
				saveReopen: "passed" | "blocked";
				issues: string[];
			};
			metrics: {
				latencyMs: number;
				inputTokens: number | null;
				outputTokens: number | null;
				lineCount: number;
				unresolvedCount: number;
				factExpectations: {
					provider: SalesRequestFactStageMetrics;
					seed: SalesRequestFactStageMetrics;
				};
				providerOracle: EvaluationMetrics | null;
				seedOracle: EvaluationMetrics | null;
			};
	  }
	| {
			status: "error";
			caseId: string;
			providerOutput: unknown;
			validation: { status: "failed"; error: string; hydration: "not-run" };
			metrics: {
				latencyMs: number;
				providerFailure?: SalesRequestProviderFailureDiagnostic;
			};
	  };

export function buildSalesRequestModelInput(input: {
	text: string;
	configurationJson: string;
	configurationRevision: string;
}) {
	return {
		configurationRevision: input.configurationRevision,
		system: buildSalesRequestInstructions(input.configurationJson),
		messages: [{ role: "user" as const, content: input.text }],
		outputContract: z.toJSONSchema(newSalesFormSeedV2Schema),
	};
}

function sha256(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

export function assertSalesRequestCorpusConfigurationLock(input: {
	caseData: SalesRequestCorpusCase;
	configurationJson: string;
	configurationRevision: string;
}) {
	const lock = input.caseData.configurationLock;
	if (
		lock.configurationRevision !== input.configurationRevision ||
		lock.configurationSha256 !== sha256(input.configurationJson) ||
		lock.promptVersion !== SALES_REQUEST_PROMPT_VERSION ||
		lock.outputContract !== "new-sales-form-seed-v2"
	) {
		throw new Error(
			`Corpus case ${input.caseData.id} does not match the evaluation configuration.`,
		);
	}
}

function valueAtPath(value: unknown, path: string): unknown {
	const tokens = [...path.matchAll(/([A-Za-z][A-Za-z0-9]*)|\[(\d+)\]/g)].map(
		(match) => (match[1] === undefined ? Number(match[2]) : match[1]),
	);
	let current = value;
	for (const token of tokens) {
		if (typeof token === "number") {
			if (!Array.isArray(current)) return undefined;
			current = current[token];
			continue;
		}
		if (!current || typeof current !== "object" || Array.isArray(current)) {
			return undefined;
		}
		current = (current as Record<string, unknown>)[token];
	}
	return current;
}

const factClassifications = [
	"supported",
	"ambiguous",
	"custom",
	"unsupported",
] as const;
const factFamilies = [
	"door-hpt",
	"mouldings",
	"services",
	"delivery",
	"custom-value",
] as const;

function factMetricBucket(expected: number, matched: number) {
	return {
		expected,
		matched,
		matchRate: expected === 0 ? null : matched / expected,
	};
}

function scoreFactStage(
	facts: SalesRequestCorpusFactExpectations["facts"],
	output: unknown,
	stage: "provider" | "seed",
): SalesRequestFactStageMetrics {
	const matches = new Map(
		facts.map((fact) => [
			fact.id,
			isDeepStrictEqual(
				valueAtPath(output, fact[stage].path),
				fact[stage].value,
			),
		]),
	);
	const bucket = (
		predicate: (
			fact: SalesRequestCorpusFactExpectations["facts"][number],
		) => boolean,
	) => {
		const selected = facts.filter(predicate);
		return factMetricBucket(
			selected.length,
			selected.filter((fact) => matches.get(fact.id) === true).length,
		);
	};
	return {
		all: bucket(() => true),
		supportedAccuracy: bucket((fact) => fact.classification === "supported"),
		ambiguousUnsupportedContainment: bucket(
			(fact) =>
				fact.classification === "ambiguous" ||
				fact.classification === "unsupported",
		),
		byClassification: Object.fromEntries(
			factClassifications.map((classification) => [
				classification,
				bucket((fact) => fact.classification === classification),
			]),
		) as SalesRequestFactStageMetrics["byClassification"],
		byFamily: Object.fromEntries(
			factFamilies.map((family) => [
				family,
				bucket((fact) => fact.family === family),
			]),
		) as SalesRequestFactStageMetrics["byFamily"],
	};
}

export function evaluateSalesRequestFactExpectations(input: {
	caseData: Pick<SalesRequestCorpusCase, "factExpectations">;
	providerOutput: unknown;
	seed: NewSalesFormSeed;
}) {
	const issues: string[] = [];
	for (const fact of input.caseData.factExpectations.facts) {
		for (const [stage, output, expectation] of [
			["provider", input.providerOutput, fact.provider],
			["seed", input.seed, fact.seed],
		] as const) {
			if (
				!isDeepStrictEqual(
					valueAtPath(output, expectation.path),
					expectation.value,
				)
			) {
				issues.push(`fact-mismatch:${fact.id}:${stage}:${expectation.path}`);
			}
		}
	}
	return {
		issues,
		metrics: {
			provider: scoreFactStage(
				input.caseData.factExpectations.facts,
				input.providerOutput,
				"provider",
			),
			seed: scoreFactStage(
				input.caseData.factExpectations.facts,
				input.seed,
				"seed",
			),
		},
	};
}

type CompatibilityConfiguration = {
	routes: Array<{
		itemTypeUid: string;
		rootStepId: number;
		stepUids: string[];
		config?: Record<string, unknown>;
	}>;
	steps: Array<{
		id: number;
		uid: string;
		title?: string;
		doorSizeVariation?: unknown[];
		components: Array<[string, string]>;
	}>;
	visibilityByComponentUid: Record<string, unknown>;
};

function getShelfItemSelectionPaths(input: {
	caseId: string;
	configurationJson: string;
	output: NewSalesFormSeed;
	stage: "provider" | "seed";
}) {
	const configuration = JSON.parse(
		input.configurationJson,
	) as CompatibilityConfiguration;
	const shelfItemUids = new Set(
		configuration.steps.flatMap((step) =>
			step.components.flatMap(([uid, title]) =>
				/^SHELF ITEMS?$/i.test(title.trim()) ? [uid] : [],
			),
		),
	);
	return input.output.lineItems.flatMap((line, lineIndex) =>
		line.formSteps.flatMap((step) => {
			if ("prodUid" in step && shelfItemUids.has(step.prodUid)) {
				return [
					`${input.stage}:lineItems[${lineIndex}].formSteps.${step.stepId}`,
				];
			}
			if (
				"meta" in step &&
				step.meta.selectedProdUids.some((uid) => shelfItemUids.has(uid))
			) {
				return [
					`${input.stage}:lineItems[${lineIndex}].formSteps.${step.stepId}`,
				];
			}
			return [];
		}),
	);
}

function appendUnsafePaths(
	metrics: EvaluationMetrics | null,
	paths: string[],
): EvaluationMetrics | null {
	if (!metrics || paths.length === 0) return metrics;
	const unsafeGuessPaths = [
		...new Set([...metrics.unsafeGuessPaths, ...paths]),
	];
	return {
		...metrics,
		wholeOrderMatch: false,
		unsafeGuesses: unsafeGuessPaths.length,
		unsafeGuessPaths,
	};
}

export type SalesRequestCorpusSeedCompatibility = {
	initializer: "passed" | "blocked";
	saveReopen: "passed" | "blocked";
	unresolvedCount: number;
	issues: string[];
};

/**
 * Exercises the real initializer and native draft round-trip against a
 * deterministic price-neutral projection. This proves structural compatibility;
 * current prices are still resolved by the New Sales Form at apply time.
 */
export async function verifySalesRequestCorpusSeedCompatibility(
	seed: NewSalesFormSeed,
	configurationJson: string,
): Promise<SalesRequestCorpusSeedCompatibility> {
	const configuration = JSON.parse(
		configurationJson,
	) as CompatibilityConfiguration;
	const rootStepId = configuration.routes[0]?.rootStepId;
	const rootStep = configuration.steps.find((step) => step.id === rootStepId);
	const routeData: WorkflowRouteData = {
		rootStepUid: rootStep?.uid || null,
		stepsById: Object.fromEntries(
			configuration.steps.map((step) => [step.id, step.uid]),
		),
		stepsByUid: Object.fromEntries(
			configuration.steps.map((step) => [
				step.uid,
				{
					id: step.id,
					uid: step.uid,
					title: step.title || "",
					...(step.doorSizeVariation?.length
						? { meta: { doorSizeVariation: step.doorSizeVariation } }
						: {}),
				},
			]),
		),
		composedRouter: Object.fromEntries(
			configuration.routes.map((route) => [
				route.itemTypeUid,
				{
					routeSequence: route.stepUids.map((uid) => ({ uid })),
					config: route.config || {},
				},
			]),
		),
	};
	const componentsByStepId = new Map<number, WorkflowComponentRecord[]>();
	let componentId = 1;
	for (const step of configuration.steps) {
		componentsByStepId.set(
			step.id,
			step.components.map(([uid, title]) => {
				const visibility = configuration.visibilityByComponentUid[uid];
				const projectedVisibility =
					visibility &&
					typeof visibility === "object" &&
					!Array.isArray(visibility)
						? (visibility as Record<string, unknown>)
						: {};
				return {
					id: componentId++,
					uid,
					title,
					basePrice: 1,
					salesPrice: 1,
					...projectedVisibility,
				};
			}),
		);
	}
	const initialized = await initializeNewSalesFormSeed({
		seed,
		baseRecord: {
			type: "quote",
			salesId: null,
			form: { customerProfileId: 1 },
			lineItems: [],
			extraCosts: [],
			summary: { taxRate: 0 },
		},
		routeData,
		pricing: { profileCoefficient: 1 },
		resolveComponents: ({ step }) =>
			componentsByStepId.get(Number(step.id)) || [],
	});
	const issues = initialized.issues.map((issue) =>
		[issue.reason, issue.lineUid, issue.stepId ?? "", issue.componentUid ?? ""]
			.filter((value) => value !== "")
			.join(":"),
	);
	if (initialized.unresolved.length || issues.length) {
		return {
			initializer: "blocked",
			saveReopen: "blocked",
			unresolvedCount: initialized.unresolved.length,
			issues,
		};
	}
	const payload = toSalesFormSaveDraftPayload(initialized.record, true);
	const reopened = hydrateSalesFormRecord({
		...initialized.record,
		form: payload.meta,
		lineItems: payload.lineItems,
		extraCosts: payload.extraCosts,
		summary: payload.summary,
	});
	const reopenedPayload = toSalesFormSaveDraftPayload(reopened, true);
	if (!isDeepStrictEqual(payload, reopenedPayload)) {
		throw new Error(
			"Corpus seed changed during the native save/reopen round-trip.",
		);
	}
	return {
		initializer: "passed",
		saveReopen: "passed",
		unresolvedCount: 0,
		issues: [],
	};
}

async function readOptionalSeed(path: string) {
	try {
		return newSalesFormSeedV2Schema.parse(
			JSON.parse(await readFile(path, "utf8")),
		);
	} catch (error) {
		if ((error as { code?: string }).code === "ENOENT") return undefined;
		throw error;
	}
}

async function readRequiredJson<T>(
	path: string,
	schema: z.ZodType<T>,
): Promise<T> {
	try {
		return schema.parse(JSON.parse(await readFile(path, "utf8")));
	} catch (error) {
		if ((error as { code?: string }).code === "ENOENT") {
			throw new Error(`Required corpus sidecar is missing: ${path}`);
		}
		throw error;
	}
}

export async function loadSalesRequestCorpus(
	casesDirectory: string,
	selectedCaseId?: string,
): Promise<SalesRequestCorpusCase[]> {
	const entries = await readdir(casesDirectory, { withFileTypes: true });
	const caseDirectories = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.filter((id) => !selectedCaseId || id === selectedCaseId)
		.sort();
	if (selectedCaseId && caseDirectories.length === 0) {
		throw new Error(`Unknown corpus case: ${selectedCaseId}`);
	}

	const cases: SalesRequestCorpusCase[] = [];
	for (const directoryName of caseDirectories) {
		const directory = join(casesDirectory, directoryName);
		const metadata = caseMetadataSchema.parse(
			JSON.parse(await readFile(join(directory, "case.json"), "utf8")),
		);
		if (metadata.id !== directoryName) {
			throw new Error(
				`Corpus case ID must match its directory: ${directoryName}`,
			);
		}
		const text = await readFile(join(directory, "input.md"), "utf8");
		if (!text.trim())
			throw new Error(`Corpus case input is empty: ${metadata.id}`);
		const configurationLock = await readRequiredJson(
			join(directory, "configuration-lock.json"),
			configurationLockSchema,
		);
		const factExpectations = await readRequiredJson(
			join(directory, "fact-expectations.json"),
			salesRequestCorpusFactExpectationsSchema,
		);
		const expectedProviderOutput = await readOptionalSeed(
			join(directory, "expected-provider-output.json"),
		);
		const expectedSeed = await readOptionalSeed(
			join(directory, "expected-seed.json"),
		);
		cases.push({
			...metadata,
			text,
			inputSha256: sha256(text),
			configurationLock,
			factExpectations,
			...(expectedProviderOutput ? { expectedProviderOutput } : {}),
			...(expectedSeed ? { expectedSeed } : {}),
		});
	}
	if (cases.length === 0) throw new Error("The sales request corpus is empty");
	return cases;
}

export async function evaluateSalesRequestCorpusCase(input: {
	caseData: SalesRequestCorpusCase;
	configurationJson: string;
	configurationRevision: string;
	provider: SalesRequestProvider;
}): Promise<SalesRequestCorpusCaseResult> {
	const startedAt = performance.now();
	let providerOutput: unknown = null;
	let providerFailure: SalesRequestProviderFailureDiagnostic | undefined;
	try {
		assertSalesRequestCorpusConfigurationLock(input);
	} catch (error) {
		return {
			status: "error",
			caseId: input.caseData.id,
			providerOutput,
			validation: {
				status: "failed",
				error: error instanceof Error ? error.message : "Invalid corpus lock",
				hydration: "not-run",
			},
			metrics: {
				latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
			},
		};
	}
	const capturingProvider: SalesRequestProvider = async (request) => {
		try {
			const result = await input.provider(request);
			providerOutput = result.output;
			return result;
		} catch (error) {
			if (error instanceof SalesRequestProviderExecutionError) {
				providerFailure = error.diagnostic;
			}
			throw error;
		}
	};
	try {
		const result = await generateNewSalesFormSeed(
			{
				text: input.caseData.text,
				images: [],
				signal: new AbortController().signal,
				configurationJson: input.configurationJson,
				configurationRevision: input.configurationRevision,
			},
			capturingProvider,
		);
		const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;
		const parsedProviderOutput =
			newSalesFormSeedV2Schema.safeParse(providerOutput);
		const providerShelfPaths = parsedProviderOutput.success
			? getShelfItemSelectionPaths({
					caseId: input.caseData.id,
					configurationJson: input.configurationJson,
					output: parsedProviderOutput.data,
					stage: "provider",
				})
			: [];
		const seedShelfPaths = getShelfItemSelectionPaths({
			caseId: input.caseData.id,
			configurationJson: input.configurationJson,
			output: result.seed,
			stage: "seed",
		});
		const factEvaluation = evaluateSalesRequestFactExpectations({
			caseData: input.caseData,
			providerOutput,
			seed: result.seed,
		});
		const compatibility = await verifySalesRequestCorpusSeedCompatibility(
			result.seed,
			input.configurationJson,
		);
		const providerOracle = appendUnsafePaths(
			input.caseData.expectedProviderOutput && parsedProviderOutput.success
				? scoreNewSalesFormSeed(
						input.caseData.expectedProviderOutput,
						parsedProviderOutput.data,
						{
							latencyMs,
							inputTokens: result.usage.inputTokens,
							outputTokens: result.usage.outputTokens,
						},
					)
				: null,
			providerShelfPaths,
		);
		const seedOracle = appendUnsafePaths(
			input.caseData.expectedSeed
				? scoreNewSalesFormSeed(input.caseData.expectedSeed, result.seed, {
						latencyMs,
						inputTokens: result.usage.inputTokens,
						outputTokens: result.usage.outputTokens,
					})
				: null,
			seedShelfPaths,
		);
		const qualityIssues = [
			...factEvaluation.issues,
			...providerShelfPaths.map((path) => `excluded-shelf-item:${path}`),
			...seedShelfPaths.map((path) => `excluded-shelf-item:${path}`),
		];
		const reviewRequired =
			qualityIssues.length > 0 ||
			providerOracle?.wholeOrderMatch === false ||
			seedOracle?.wholeOrderMatch === false;
		return {
			status: reviewRequired ? "review-required" : "ok",
			caseId: input.caseData.id,
			providerOutput,
			seed: result.seed,
			validation: {
				status: reviewRequired ? "review-required" : "passed",
				facts: factEvaluation.issues.length ? "failed" : "passed",
				normalization: "passed",
				initializer: compatibility.initializer,
				saveReopen: compatibility.saveReopen,
				issues: [...qualityIssues, ...compatibility.issues],
			},
			metrics: {
				latencyMs,
				inputTokens: result.usage.inputTokens ?? null,
				outputTokens: result.usage.outputTokens ?? null,
				lineCount: result.seed.lineItems.length,
				unresolvedCount: result.seed.unresolved.length,
				factExpectations: factEvaluation.metrics,
				providerOracle,
				seedOracle,
			},
		};
	} catch (error) {
		return {
			status: "error",
			caseId: input.caseData.id,
			providerOutput,
			validation: {
				status: "failed",
				error: error instanceof Error ? error.message : "Evaluation failed",
				hydration: "not-run",
			},
			metrics: {
				latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
				...(providerFailure ? { providerFailure } : {}),
			},
		};
	}
}
