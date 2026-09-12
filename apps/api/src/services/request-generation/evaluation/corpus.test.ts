import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SalesRequestProviderExecutionError } from "../../sales-request-provider";
import {
	buildSalesRequestModelInput,
	evaluateSalesRequestCorpusCase,
	getSalesRequestCorpusOracleCoverage,
	loadSalesRequestCorpus,
} from "./corpus";

const configurationJson = JSON.stringify({
	schemaVersion: 1,
	routes: [],
	steps: [],
	visibilityByComponentUid: {},
});

describe("sales request evaluation corpus", () => {
	test("builds the exact text-only model input without credentials", () => {
		const input = buildSalesRequestModelInput({
			text: "one door",
			configurationJson,
			configurationRevision: "revision",
		});
		expect(input.messages).toEqual([{ role: "user", content: "one door" }]);
		expect(input.system).toContain(configurationJson);
		expect(JSON.stringify(input.outputContract)).toContain(
			'"schemaVersion":{"type":"number","const":2}',
		);
		expect(JSON.stringify(input.outputContract)).not.toContain('"const":1');
		expect(JSON.stringify(input)).not.toContain("API_KEY");
	});

	test("loads sanitized cases deterministically and hashes exact input", async () => {
		const root = await mkdtemp(join(tmpdir(), "sales-request-corpus-"));
		for (const id of ["second-case", "first-case"]) {
			const directory = join(root, id);
			await mkdir(directory);
			await writeFile(
				join(directory, "case.json"),
				JSON.stringify({
					id,
					label: id,
					language: "en",
					sourceType: "email",
					sanitized: true,
				}),
			);
			await writeFile(join(directory, "input.md"), `${id}\n`);
		}

		const cases = await loadSalesRequestCorpus(root);
		expect(cases.map(({ id }) => id)).toEqual(["first-case", "second-case"]);
		expect(cases[0]?.text).toBe("first-case\n");
		expect(cases[0]?.inputSha256).toHaveLength(64);
	});

	test("loads and scores an optional normalized seed oracle", async () => {
		const root = await mkdtemp(join(tmpdir(), "sales-request-corpus-oracle-"));
		const directory = join(root, "moulding-case");
		await mkdir(directory);
		await writeFile(
			join(directory, "case.json"),
			JSON.stringify({
				id: "moulding-case",
				label: "Moulding case",
				language: "en",
				sourceType: "email",
				sanitized: true,
			}),
		);
		await writeFile(join(directory, "input.md"), "pickup and delivery\n");
		const seed = {
			schemaVersion: 2 as const,
			lineItems: [],
			unresolved: [
				{
					lineUid: null,
					stepId: null,
					field: "request",
					status: "unsupported" as const,
					reason: "No configured route",
				},
			],
		};
		const expectedProviderOutput = {
			...seed,
			form: { deliveryOption: "pickup" as const },
		};
		const expectedSeed = {
			...seed,
			form: { deliveryOption: "delivery" as const },
		};
		await writeFile(
			join(directory, "expected-provider-output.json"),
			JSON.stringify(expectedProviderOutput),
		);
		await writeFile(
			join(directory, "expected-seed.json"),
			JSON.stringify(expectedSeed),
		);

		const [caseData] = await loadSalesRequestCorpus(root);
		expect(caseData?.expectedProviderOutput).toEqual(expectedProviderOutput);
		expect(caseData?.expectedSeed).toEqual(expectedSeed);
		if (!caseData) throw new Error("Expected corpus case");

		const result = await evaluateSalesRequestCorpusCase({
			caseData,
			configurationJson,
			configurationRevision: "revision",
			provider: async () => ({ output: expectedSeed }),
		});

		expect(result).toMatchObject({
			status: "ok",
			metrics: {
				providerOracle: {
					wholeOrderMatch: false,
					mismatches: [{ path: "form.deliveryOption" }],
				},
				seedOracle: {
					wholeOrderMatch: true,
					unsafeGuesses: 0,
					mismatches: [],
				},
			},
		});
	});

	test("reports provider and normalized oracle coverage independently", () => {
		const baseCase = {
			label: "Case",
			language: "en" as const,
			sourceType: "email" as const,
			sanitized: true as const,
			text: "one door",
			inputSha256: "hash",
		};
		const emptySeed = {
			schemaVersion: 2 as const,
			lineItems: [],
			unresolved: [],
		};

		expect(
			getSalesRequestCorpusOracleCoverage([
				{ ...baseCase, id: "provider-only", expectedProviderOutput: emptySeed },
				{ ...baseCase, id: "seed-only", expectedSeed: emptySeed },
				{
					...baseCase,
					id: "both",
					expectedProviderOutput: emptySeed,
					expectedSeed: emptySeed,
				},
			]),
		).toEqual({
			providerOracleCaseIds: ["provider-only", "both"],
			seedOracleCaseIds: ["seed-only", "both"],
		});
	});

	test("captures structured provider output and validated seed separately", async () => {
		const seed = {
			schemaVersion: 1,
			lineItems: [],
			unresolved: [
				{
					lineUid: null,
					stepId: null,
					field: "request",
					status: "unsupported" as const,
					reason: "No configured route",
				},
			],
		};
		const result = await evaluateSalesRequestCorpusCase({
			caseData: {
				id: "first-case",
				label: "First case",
				language: "en",
				sourceType: "email",
				sanitized: true,
				text: "one door",
				inputSha256: "hash",
			},
			configurationJson,
			configurationRevision: "revision",
			provider: async () => ({
				output: seed,
				inputTokens: 10,
				outputTokens: 20,
			}),
		});

		expect(result).toMatchObject({
			status: "ok",
			providerOutput: seed,
			seed,
			metrics: { inputTokens: 10, outputTokens: 20, unresolvedCount: 1 },
		});
	});

	test("records safe validation failures without aborting the corpus", async () => {
		const result = await evaluateSalesRequestCorpusCase({
			caseData: {
				id: "first-case",
				label: "First case",
				language: "en",
				sourceType: "email",
				sanitized: true,
				text: "one door",
				inputSha256: "hash",
			},
			configurationJson,
			configurationRevision: "revision",
			provider: async () => {
				throw new Error("secret provider details");
			},
		});

		expect(result).toMatchObject({
			status: "error",
			providerOutput: null,
			validation: {
				status: "failed",
				error:
					"The AI provider could not generate a request preview. Try again.",
			},
		});
	});

	test("records only privacy-safe provider failure diagnostics", async () => {
		const result = await evaluateSalesRequestCorpusCase({
			caseData: {
				id: "first-case",
				label: "First case",
				language: "en",
				sourceType: "email",
				sanitized: true,
				text: "private customer request",
				inputSha256: "hash",
			},
			configurationJson,
			configurationRevision: "revision",
			provider: async () => {
				throw new SalesRequestProviderExecutionError({
					stage: "provider-api",
					statusCode: 429,
					retryable: true,
				});
			},
		});

		expect(result).toMatchObject({
			status: "error",
			metrics: {
				providerFailure: {
					stage: "provider-api",
					statusCode: 429,
					retryable: true,
				},
			},
		});
		expect(JSON.stringify(result)).not.toContain("private customer request");
	});
});
