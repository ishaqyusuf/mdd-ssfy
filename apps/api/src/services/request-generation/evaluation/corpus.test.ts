import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { SalesRequestProviderExecutionError } from "../../sales-request-provider";
import {
	assertSalesRequestCorpusConfigurationLock,
	buildSalesRequestModelInput,
	evaluateSalesRequestCorpusCase,
	getSalesRequestCorpusOracleCoverage,
	loadSalesRequestCorpus,
	verifySalesRequestCorpusSeedCompatibility,
} from "./corpus";

const configurationJson = JSON.stringify({
	schemaVersion: 1,
	routes: [],
	steps: [],
	visibilityByComponentUid: {},
});
const configurationRevision = createHash("sha256")
	.update(configurationJson)
	.digest("hex");

const configurationLock = {
	configurationRevision,
	configurationSha256: configurationRevision,
	promptVersion: SALES_REQUEST_PROMPT_VERSION,
	outputContract: "new-sales-form-seed-v2",
} as const;

const requestFact = {
	id: "request-unsupported",
	family: "door-hpt",
	classification: "unsupported",
	description: "The request has no configured route.",
	provider: {
		path: "unresolved[0]",
		value: {
			lineUid: null,
			stepId: null,
			field: "request",
			status: "unsupported",
			reason: "No configured route",
		},
	},
	seed: {
		path: "unresolved[0]",
		value: {
			lineUid: null,
			stepId: null,
			field: "request",
			status: "unsupported",
			reason: "No configured route",
		},
	},
} as const;

async function writeRequiredSidecars(directory: string) {
	await writeFile(
		join(directory, "configuration-lock.json"),
		JSON.stringify(configurationLock),
	);
	await writeFile(
		join(directory, "fact-expectations.json"),
		JSON.stringify({ shelfItemsExcluded: true, facts: [requestFact] }),
	);
}

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
			await writeRequiredSidecars(directory);
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
		await writeRequiredSidecars(directory);
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
			configurationRevision,
			provider: async () => ({ output: expectedSeed }),
		});

		expect(result).toMatchObject({
			status: "review-required",
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

	test("requires strict configuration-lock and fact-expectation sidecars", async () => {
		const root = await mkdtemp(join(tmpdir(), "sales-request-corpus-lock-"));
		const directory = join(root, "missing-lock");
		await mkdir(directory);
		await writeFile(
			join(directory, "case.json"),
			JSON.stringify({
				id: "missing-lock",
				label: "Missing lock",
				language: "en",
				sourceType: "email",
				sanitized: true,
			}),
		);
		await writeFile(join(directory, "input.md"), "one door\n");

		await expect(loadSalesRequestCorpus(root)).rejects.toThrow(
			"configuration-lock.json",
		);
	});

	test("rejects a configuration lock mismatch before invoking the provider", async () => {
		let providerCalls = 0;
		const result = await evaluateSalesRequestCorpusCase({
			caseData: {
				id: "locked-case",
				label: "Locked case",
				language: "en",
				sourceType: "email",
				sanitized: true,
				text: "one door",
				inputSha256: "hash",
				configurationLock: {
					...configurationLock,
					configurationRevision: "a".repeat(64),
				},
				factExpectations: {
					shelfItemsExcluded: true,
					facts: [requestFact],
				},
			},
			configurationJson,
			configurationRevision,
			provider: async () => {
				providerCalls += 1;
				return { output: requestFact.provider.value };
			},
		});

		expect(result).toMatchObject({
			status: "error",
			validation: {
				status: "failed",
				error:
					"Corpus case locked-case does not match the evaluation configuration.",
			},
		});
		expect(providerCalls).toBe(0);
	});

	test("exposes configuration lock validation for runner preflight", () => {
		expect(() =>
			assertSalesRequestCorpusConfigurationLock({
				caseData: {
					id: "locked-case",
					label: "Locked case",
					language: "en",
					sourceType: "email",
					sanitized: true,
					text: "one door",
					inputSha256: "hash",
					configurationLock: {
						...configurationLock,
						configurationRevision: "a".repeat(64),
					},
					factExpectations: {
						shelfItemsExcluded: true,
						facts: [requestFact],
					},
				},
				configurationJson,
				configurationRevision,
			}),
		).toThrow(
			"Corpus case locked-case does not match the evaluation configuration.",
		);
	});

	test("retains scores and seed for review when a fact expectation is not met", async () => {
		const output = {
			schemaVersion: 2 as const,
			lineItems: [],
			unresolved: [
				{
					lineUid: null,
					stepId: null,
					field: "request",
					status: "unsupported" as const,
					reason: "Different safe reason",
				},
			],
		};
		const result = await evaluateSalesRequestCorpusCase({
			caseData: {
				id: "fact-locked-case",
				label: "Fact locked case",
				language: "en",
				sourceType: "email",
				sanitized: true,
				text: "one door",
				inputSha256: "hash",
				configurationLock,
				factExpectations: {
					shelfItemsExcluded: true,
					facts: [requestFact],
				},
			},
			configurationJson,
			configurationRevision,
			provider: async () => ({ output }),
		});

		expect(result).toMatchObject({
			status: "review-required",
			validation: {
				status: "review-required",
				facts: "failed",
				issues: [
					"fact-mismatch:request-unsupported:provider:unresolved[0]",
					"fact-mismatch:request-unsupported:seed:unresolved[0]",
					"empty-native-draft",
				],
			},
			seed: output,
			metrics: {
				lineCount: 0,
				unresolvedCount: 1,
				factExpectations: {
					provider: {
						all: { expected: 1, matched: 0, matchRate: 0 },
						ambiguousUnsupportedContainment: {
							expected: 1,
							matched: 0,
							matchRate: 0,
						},
					},
					seed: {
						all: { expected: 1, matched: 0, matchRate: 0 },
						ambiguousUnsupportedContainment: {
							expected: 1,
							matched: 0,
							matchRate: 0,
						},
					},
				},
			},
		});
	});

	test("excludes Shelf Items selections from offline corpus scoring", async () => {
		const shelfConfigurationJson = JSON.stringify({
			schemaVersion: 1,
			routes: [
				{
					itemTypeUid: "shelf-item",
					rootStepId: 1,
					stepUids: [],
				},
			],
			steps: [
				{
					id: 1,
					uid: "item-type",
					title: "Item Type",
					selectionMode: "single",
					components: [["shelf-item", "Shelf Items"]],
				},
			],
			visibilityByComponentUid: {},
		});
		const shelfRevision = createHash("sha256")
			.update(shelfConfigurationJson)
			.digest("hex");
		const output = {
			schemaVersion: 2 as const,
			lineItems: [
				{
					uid: "shelf-line",
					qty: 1,
					formSteps: [{ stepId: 1, prodUid: "shelf-item" }],
				},
			],
			unresolved: [],
		};
		const result = await evaluateSalesRequestCorpusCase({
			caseData: {
				id: "shelf-excluded",
				label: "Shelf excluded",
				language: "en",
				sourceType: "email",
				sanitized: true,
				text: "one shelf item",
				inputSha256: "hash",
				configurationLock: {
					...configurationLock,
					configurationRevision: shelfRevision,
					configurationSha256: shelfRevision,
				},
				factExpectations: {
					shelfItemsExcluded: true,
					facts: [
						{
							id: "shelf-selection",
							family: "door-hpt",
							classification: "supported",
							description: "Invalid fixture tries to score Shelf Items.",
							provider: { path: "lineItems[0]", value: output.lineItems[0] },
							seed: { path: "lineItems[0]", value: output.lineItems[0] },
						},
					],
				},
			},
			configurationJson: shelfConfigurationJson,
			configurationRevision: shelfRevision,
			provider: async () => ({ output }),
		});

		expect(result).toMatchObject({
			status: "review-required",
			validation: {
				status: "review-required",
				issues: [
					"excluded-shelf-item:provider:lineItems[0].formSteps.1",
					"excluded-shelf-item:seed:lineItems[0].formSteps.1",
				],
			},
			seed: output,
		});
	});

	test("runs the real initializer and save-reopen seams for compatible seeds", async () => {
		const compatibleConfiguration = JSON.stringify({
			schemaVersion: 1,
			routes: [
				{
					itemTypeUid: "simple-item",
					rootStepId: 1,
					stepUids: [],
				},
			],
			steps: [
				{
					id: 1,
					uid: "item-type",
					title: "Item Type",
					selectionMode: "single",
					components: [["simple-item", "Simple Item"]],
				},
			],
			visibilityByComponentUid: {},
		});
		const seed = {
			schemaVersion: 2 as const,
			lineItems: [
				{
					uid: "line-1",
					qty: 2,
					formSteps: [{ stepId: 1, prodUid: "simple-item" }],
				},
			],
			unresolved: [],
		};

		await expect(
			verifySalesRequestCorpusSeedCompatibility(seed, compatibleConfiguration),
		).resolves.toMatchObject({
			initializer: "passed",
			saveReopen: "passed",
			unresolvedCount: 0,
			issues: [],
		});
		await expect(
			verifySalesRequestCorpusSeedCompatibility(
				{
					...seed,
					unresolved: [
						{
							lineUid: null,
							stepId: null,
							field: "anotherProduct",
							status: "unsupported",
							reason: "Sales review needed for an additional product",
						},
					],
				},
				compatibleConfiguration,
			),
		).resolves.toMatchObject({
			initializer: "passed",
			saveReopen: "passed",
			unresolvedCount: 1,
			issues: [],
		});
	});

	test("does not pass a fact-matching seed that cannot open a native draft", async () => {
		const output = {
			schemaVersion: 2 as const,
			lineItems: [],
			unresolved: [requestFact.provider.value],
		};
		const result = await evaluateSalesRequestCorpusCase({
			caseData: {
				id: "blocked-native-draft",
				label: "Blocked native draft",
				language: "en",
				sourceType: "email",
				sanitized: true,
				text: "one door",
				inputSha256: "hash",
				configurationLock,
				factExpectations: {
					shelfItemsExcluded: true,
					facts: [requestFact],
				},
				expectedProviderOutput: output,
				expectedSeed: output,
			},
			configurationJson,
			configurationRevision,
			provider: async () => ({ output }),
		});

		expect(result).toMatchObject({
			status: "review-required",
			validation: {
				status: "review-required",
				facts: "passed",
				initializer: "blocked",
				saveReopen: "blocked",
			},
			metrics: {
				providerOracle: { wholeOrderMatch: true },
				seedOracle: { wholeOrderMatch: true },
			},
		});
	});

	test("replays every supplied email oracle offline through native compatibility", async () => {
		const repositoryRoot = resolve(import.meta.dir, "../../../../../..");
		const cases = await loadSalesRequestCorpus(
			join(repositoryRoot, ".brain/evaluations/sales-request-generation/cases"),
		);
		const suppliedCaseIds = [
			"duplex-millwork-order",
			"exterior-impact-door-sidelite",
			"interior-solid-core-slabs",
			"spanish-carrara-door-package",
			"spanish-fire-rated-double-doors",
			"townhouse-multifloor-door-package",
		];
		const expectedNative: Record<string, "passed" | "blocked"> = {
			"duplex-millwork-order": "blocked",
			"interior-solid-core-slabs": "blocked",
			"spanish-carrara-door-package": "blocked",
			"spanish-fire-rated-double-doors": "passed",
			"townhouse-multifloor-door-package": "blocked",
		};
		const configurationPath = join(
			repositoryRoot,
			".brain/evaluations/sales-request-generation/runs/2026-09-12T-input-review-mouldings-exact-multi-selection-v3/deepseek/deepseek-v4-flash/configuration.json",
		);
		const currentConfigurationJson = JSON.stringify(
			JSON.parse(await readFile(configurationPath, "utf8")),
		);
		const currentRevision = createHash("sha256")
			.update(currentConfigurationJson)
			.digest("hex");

		expect(currentRevision).toBe(
			"2f101a8a257491570612e9f06d8404eeddaa7e3eacc0d2d8ad5eaa3921b61d09",
		);
		const suppliedCases = suppliedCaseIds.map((id) => {
			const caseData = cases.find((candidate) => candidate.id === id);
			if (!caseData) throw new Error(`Missing supplied corpus case ${id}`);
			expect(caseData.expectedProviderOutput).toBeDefined();
			expect(caseData.expectedSeed).toBeDefined();
			return caseData;
		});
		expect(
			suppliedCases.reduce(
				(total, caseData) => total + caseData.factExpectations.facts.length,
				0,
			),
		).toBe(51);
		expect(
			[
				...new Set(
					suppliedCases.flatMap((caseData) =>
						caseData.factExpectations.facts.map((fact) => fact.classification),
					),
				),
			].sort(),
		).toEqual(["ambiguous", "custom", "supported", "unsupported"]);

		for (const caseData of suppliedCases) {
			const caseConfigurationJson =
				caseData.id === "interior-solid-core-slabs"
					? JSON.stringify(
							JSON.parse(
								await readFile(
									join(
										repositoryRoot,
										".brain/evaluations/sales-request-generation/runs/2026-09-14T-direct-debug-interior-solid-core-slabs-mock-v3/deepseek/deepseek-v4-flash/configuration.json",
									),
									"utf8",
								),
							),
						)
					: currentConfigurationJson;
			const caseRevision = createHash("sha256")
				.update(caseConfigurationJson)
				.digest("hex");
			const result = await evaluateSalesRequestCorpusCase({
				caseData,
				configurationJson: caseConfigurationJson,
				configurationRevision: caseRevision,
				archivedPromptVersion: "new-sales-form-seed-v8",
				provider: async () => ({
					output: structuredClone(caseData.expectedProviderOutput),
				}),
			});
			if (caseData.id === "exterior-impact-door-sidelite") {
				expect(result.status).toBe("error");
				if (result.status === "error") {
					expect(result.providerOutput).toEqual(caseData.expectedProviderOutput);
					expect(result.validation.error).toContain(
						"panel Height from the overall sidelite assembly size");
				}
				continue;
			}
			const expectedSeedDrift = [
				"spanish-carrara-door-package",
				"spanish-fire-rated-double-doors",
				"townhouse-multifloor-door-package",
			].includes(caseData.id);
			expect(result.status, caseData.id).toBe("review-required");
			if (result.status === "error") continue;
			const expectedLines = caseData.expectedSeed?.lineItems ?? [];
			expect(result.metrics.lineCount, caseData.id).toBe(expectedLines.length);
			expect(result.seed.lineItems.reduce((total, line) => total + line.qty, 0), caseData.id).toBe(
				expectedLines.reduce((total, line) => total + line.qty, 0),
			);
			expect(result.metrics.providerOracle?.wholeOrderMatch).toBe(true);
			expect(result.metrics.seedOracle?.wholeOrderMatch, caseData.id).toBe(
				!expectedSeedDrift,
			);
			expect(
				result.metrics.seedOracle?.mismatches.map(({ path }) => path),
			).toEqual(expectedSeedDrift ? ["unresolved.lineReferences"] : []);
			if (expectedSeedDrift) {
				const lineReferences = result.metrics.seedOracle?.mismatches[0];
				const expectedFacts = (lineReferences?.expected as { facts: string[] })
					.facts;
				const actualFacts = (lineReferences?.actual as { facts: string[] })
					.facts;
				const expectedAdditionalReferences: Record<string, string[]> = {
					"spanish-fire-rated-double-doors": [
						"line:0:61:jambSize:ambiguous",
						"line:0::handing:ambiguous",
						"line:0::swing:ambiguous",
					],
					"spanish-carrara-door-package": [
						...Array(10).fill("none::doorSchedule:unsupported"),
						...Array(4).fill("none::moulding:ambiguous"),
						"none::width:ambiguous",
					],
					"townhouse-multifloor-door-package": [
						...Array(22).fill("none::doorSchedule:unsupported"),
						"none::width:unsupported",
					],
				};
				expect(actualFacts.filter((fact) => !expectedFacts.includes(fact))).toEqual(
					expectedAdditionalReferences[caseData.id],
				);
			}
			expect(result.validation).toMatchObject({
				facts: "passed",
				normalization: "passed",
			});
			expect(result.validation.initializer, caseData.id).toBe(expectedNative[caseData.id]);
			expect(result.validation.saveReopen, caseData.id).toBe(expectedNative[caseData.id]);
			if (expectedNative[caseData.id] === "blocked") {
				expect(result.validation.issues.length, caseData.id).toBeGreaterThan(0);
			} else {
				expect(result.validation.issues, caseData.id).toEqual([]);
			}
		}

		const mouldings = cases.find(
			(candidate) => candidate.id === "mouldings-exact-multi-selection",
		);
		if (!mouldings) throw new Error("Missing Mouldings control case");
		const control = await evaluateSalesRequestCorpusCase({
			caseData: mouldings,
			configurationJson: currentConfigurationJson,
			configurationRevision: currentRevision,
			archivedPromptVersion: "new-sales-form-seed-v8",
			provider: async () => ({
				output: structuredClone(mouldings.expectedProviderOutput),
			}),
		});
		expect(control.status).toBe("ok");
		if (control.status !== "error") {
			expect(control.metrics.lineCount).toBe(mouldings.expectedSeed?.lineItems.length);
			expect(control.seed.lineItems.reduce((total, line) => total + line.qty, 0)).toBe(32);
			expect(control.metrics.factExpectations.provider.all).toMatchObject({ expected: 11, matched: 11 });
			expect(control.metrics.factExpectations.seed.all).toMatchObject({ expected: 11, matched: 11 });
			expect(control.metrics.providerOracle?.wholeOrderMatch).toBe(true);
			expect(control.metrics.seedOracle?.wholeOrderMatch).toBe(true);
			expect(control.seed).toHaveProperty(
				"lineItems.0.meta.mouldingRows.0.calculation",
				{ linearFeet: 400, pieceLength: 16, wastePercentage: 10 },
			);
			expect(control.validation).toMatchObject({
				facts: "passed",
				issues: [],
				initializer: "passed",
				saveReopen: "passed",
			});
		}
	});

	test("reports provider and normalized oracle coverage independently", () => {
		const baseCase = {
			label: "Case",
			language: "en" as const,
			sourceType: "email" as const,
			sanitized: true as const,
			text: "one door",
			inputSha256: "hash",
			configurationLock,
			factExpectations: {
				shelfItemsExcluded: true as const,
				facts: [requestFact],
			},
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
				configurationLock,
				factExpectations: {
					shelfItemsExcluded: true,
					facts: [requestFact],
				},
			},
			configurationJson,
			configurationRevision,
			provider: async () => ({
				output: seed,
				inputTokens: 10,
				outputTokens: 20,
			}),
		});

		expect(result).toMatchObject({
			status: "review-required",
			validation: { initializer: "blocked", saveReopen: "blocked" },
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
				configurationLock,
				factExpectations: {
					shelfItemsExcluded: true,
					facts: [requestFact],
				},
			},
			configurationJson,
			configurationRevision,
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
				configurationLock,
				factExpectations: {
					shelfItemsExcluded: true,
					facts: [requestFact],
				},
			},
			configurationJson,
			configurationRevision,
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
