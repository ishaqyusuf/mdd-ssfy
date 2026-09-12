import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
	type NewSalesFormSeed,
	newSalesFormSeedV2Schema,
} from "@gnd/sales/sales-form-core";
import { buildSalesRequestInstructions } from "@gnd/sales/sales-form/request-generation";
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

export type SalesRequestCorpusCase = z.infer<typeof caseMetadataSchema> & {
	text: string;
	inputSha256: string;
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
			status: "ok";
			caseId: string;
			providerOutput: unknown;
			seed: unknown;
			validation: { status: "passed"; hydration: "not-run" };
			metrics: {
				latencyMs: number;
				inputTokens: number | null;
				outputTokens: number | null;
				lineCount: number;
				unresolvedCount: number;
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
		return {
			status: "ok",
			caseId: input.caseData.id,
			providerOutput,
			seed: result.seed,
			validation: { status: "passed", hydration: "not-run" },
			metrics: {
				latencyMs,
				inputTokens: result.usage.inputTokens ?? null,
				outputTokens: result.usage.outputTokens ?? null,
				lineCount: result.seed.lineItems.length,
				unresolvedCount: result.seed.unresolved.length,
				providerOracle:
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
				seedOracle: input.caseData.expectedSeed
					? scoreNewSalesFormSeed(input.caseData.expectedSeed, result.seed, {
							latencyMs,
							inputTokens: result.usage.inputTokens,
							outputTokens: result.usage.outputTokens,
						})
					: null,
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
