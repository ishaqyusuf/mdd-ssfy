import type { NewSalesFormSeed } from "@gnd/sales/sales-form-core";
import {
	type SalesRequestProvider,
	type SalesRequestProviderInput,
	generateNewSalesFormSeed,
} from "../../sales-request-generation";
import {
	EVALUATION_FIXTURES,
	type RequestGenerationEvaluationFixture,
} from "./fixtures";

export { EVALUATION_FIXTURES } from "./fixtures";

export type EvaluationFieldMismatch = {
	path: string;
	expected: unknown;
	actual: unknown;
};

export type EvaluationMetrics = {
	fieldMatches: number;
	fieldCount: number;
	fieldMatchRate: number;
	wholeOrderMatch: boolean;
	unsafeGuesses: number;
	unsafeGuessPaths: string[];
	latencyMs: number;
	inputTokens: number | null;
	outputTokens: number | null;
	mismatches: EvaluationFieldMismatch[];
};

export type EvaluationCaseResult =
	| {
			status: "ok";
			fixtureId: string;
			language: RequestGenerationEvaluationFixture["language"];
			metrics: EvaluationMetrics;
	  }
	| {
			status: "error";
			fixtureId: string;
			language: RequestGenerationEvaluationFixture["language"];
			latencyMs: number;
			error: string;
	  };

export type EvaluationReport = {
	mode: "mock" | "live";
	syntheticCorpus: true;
	cases: EvaluationCaseResult[];
	aggregate: {
		caseCount: number;
		successCount: number;
		errorCount: number;
		wholeOrderMatches: number;
		wholeOrderMatchRate: number;
		fieldMatches: number;
		fieldCount: number;
		fieldMatchRate: number;
		unsafeGuesses: number;
		latencyMs: number;
		averageLatencyMs: number;
		inputTokens: number | null;
		outputTokens: number | null;
		usageComplete: boolean;
	};
	note: string;
};

function stableStringify(value: unknown): string {
	if (value === undefined) return "undefined";
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
		.join(",")}}`;
}

function sameValue(left: unknown, right: unknown) {
	return stableStringify(left) === stableStringify(right);
}

function normalizedServiceRows(seed: NewSalesFormSeed, lineIndex: number) {
	if (seed.schemaVersion !== 2) return [];
	const rows = seed.lineItems[lineIndex]?.meta?.serviceRows ?? [];
	return rows
		.map((row) => ({
			service: row.service.trim().replace(/\s+/g, " ").toLocaleUpperCase(),
			qty: row.qty,
		}))
		.sort(
			(left, right) =>
				left.service.localeCompare(right.service) || left.qty - right.qty,
		);
}

function normalizedMouldingRows(seed: NewSalesFormSeed, lineIndex: number) {
	if (seed.schemaVersion !== 2) return [];
	const rows = seed.lineItems[lineIndex]?.meta?.mouldingRows ?? [];
	return rows
		.map((row) =>
			"qty" in row
				? { uid: row.uid, qty: row.qty }
				: {
						uid: row.uid,
						calculation: {
							linearFeet: row.calculation.linearFeet,
							pieceLength: row.calculation.pieceLength,
							...(row.calculation.wastePercentage == null
								? {}
								: {
										wastePercentage: row.calculation.wastePercentage,
									}),
						},
					},
		)
		.sort((left, right) => left.uid.localeCompare(right.uid));
}

function normalizedFormSteps(seed: NewSalesFormSeed, lineIndex: number) {
	return (seed.lineItems[lineIndex]?.formSteps ?? [])
		.map((step) => {
			const meta = "meta" in step ? step.meta : undefined;
			const selectedProdUids = meta?.selectedProdUids;
			return {
				...step,
				...(meta
					? {
							meta: {
								...meta,
								...(selectedProdUids
									? {
											selectedProdUids: [...selectedProdUids].sort(),
										}
									: {}),
							},
						}
					: {}),
			};
		})
		.sort((left, right) => left.stepId - right.stepId);
}

function deliveryOption(seed: NewSalesFormSeed) {
	return seed.schemaVersion === 2 ? (seed.form?.deliveryOption ?? null) : null;
}

function deliveryCosts(seed: NewSalesFormSeed) {
	return seed.schemaVersion === 2 ? (seed.extraCosts ?? []) : [];
}

function lineIndexByUid(seed: NewSalesFormSeed) {
	return new Map<string, number>(
		seed.lineItems.map((line, index) => [line.uid, index] as const),
	);
}

function unresolvedLineReference(
	lineUid: string | null,
	lineIndexes: Map<string, number>,
) {
	if (lineUid === null) return "none";
	const lineIndex = lineIndexes.get(lineUid);
	return lineIndex === undefined ? `unknown:${lineUid}` : `line:${lineIndex}`;
}

function unresolvedReferenceKeys(seed: NewSalesFormSeed) {
	const lineIndexes = lineIndexByUid(seed);
	return seed.unresolved
		.map((entry) => unresolvedLineReference(entry.lineUid, lineIndexes))
		.sort();
}

function unresolvedFactKeys(seed: NewSalesFormSeed) {
	const lineIndexes = lineIndexByUid(seed);
	return seed.unresolved
		.map(
			(entry) =>
				`${unresolvedLineReference(entry.lineUid, lineIndexes)}:${entry.stepId ?? ""}:${entry.field}:${entry.status}`,
		)
		.sort();
}

function findUnsafeGuesses(
	expected: NewSalesFormSeed,
	actual: NewSalesFormSeed,
) {
	const paths: string[] = [];
	for (const [lineIndex, expectedLine] of expected.lineItems.entries()) {
		const actualLine = actual.lineItems[lineIndex];
		if (!actualLine || expectedLine.housePackageTool) continue;
		const actualDoors = actualLine.housePackageTool?.doors ?? [];
		if (!actualDoors.length) continue;
		paths.push(`lineItems[${lineIndex}].housePackageTool.doors.dimension`);
		if (
			actualDoors.some(
				(door) => "lhQty" in door && (door.lhQty > 0 || door.rhQty > 0),
			)
		)
			paths.push(`lineItems[${lineIndex}].housePackageTool.doors.handing`);
		if (
			actualDoors.some((door) => "swing" in door && Boolean(door.swing?.trim()))
		)
			paths.push(`lineItems[${lineIndex}].housePackageTool.doors.swing`);
	}
	for (const [lineIndex] of actual.lineItems.entries()) {
		const actualRows = normalizedServiceRows(actual, lineIndex);
		if (
			actualRows.length > 0 &&
			!sameValue(normalizedServiceRows(expected, lineIndex), actualRows)
		) {
			paths.push(`lineItems[${lineIndex}].meta.serviceRows`);
		}
		const actualMouldingRows = normalizedMouldingRows(actual, lineIndex);
		if (
			actualMouldingRows.length > 0 &&
			!sameValue(
				normalizedMouldingRows(expected, lineIndex),
				actualMouldingRows,
			)
		) {
			paths.push(`lineItems[${lineIndex}].meta.mouldingRows`);
		}
	}
	const actualDeliveryOption = deliveryOption(actual);
	if (
		actualDeliveryOption !== null &&
		actualDeliveryOption !== deliveryOption(expected)
	) {
		paths.push("form.deliveryOption");
	}
	const actualDeliveryCosts = deliveryCosts(actual);
	if (
		actualDeliveryCosts.length > 0 &&
		!sameValue(deliveryCosts(expected), actualDeliveryCosts)
	) {
		paths.push("extraCosts");
	}
	return paths;
}

export function scoreNewSalesFormSeed(
	expected: NewSalesFormSeed,
	actual: NewSalesFormSeed,
	telemetry: { latencyMs: number; inputTokens?: number; outputTokens?: number },
): EvaluationMetrics {
	const mismatches: EvaluationFieldMismatch[] = [];
	let fieldCount = 1;
	if (expected.lineItems.length !== actual.lineItems.length) {
		mismatches.push({
			path: "lineItems.length",
			expected: expected.lineItems.length,
			actual: actual.lineItems.length,
		});
	}
	for (const [lineIndex, expectedLine] of expected.lineItems.entries()) {
		const actualLine = actual.lineItems[lineIndex];
		for (const field of ["qty", "formSteps", "housePackageTool"] as const) {
			fieldCount += 1;
			const expectedValue =
				field === "formSteps"
					? normalizedFormSteps(expected, lineIndex)
					: expectedLine[field];
			const actualValue =
				field === "formSteps"
					? normalizedFormSteps(actual, lineIndex)
					: actualLine?.[field];
			if (!sameValue(expectedValue, actualValue)) {
				mismatches.push({
					path: `lineItems[${lineIndex}].${field}`,
					expected: expectedValue,
					actual: actualValue,
				});
			}
		}
		fieldCount += 1;
		const expectedServiceRows = normalizedServiceRows(expected, lineIndex);
		const actualServiceRows = normalizedServiceRows(actual, lineIndex);
		if (!sameValue(expectedServiceRows, actualServiceRows)) {
			mismatches.push({
				path: `lineItems[${lineIndex}].meta.serviceRows`,
				expected: expectedServiceRows,
				actual: actualServiceRows,
			});
		}
		fieldCount += 1;
		const expectedMouldingRows = normalizedMouldingRows(expected, lineIndex);
		const actualMouldingRows = normalizedMouldingRows(actual, lineIndex);
		if (!sameValue(expectedMouldingRows, actualMouldingRows)) {
			mismatches.push({
				path: `lineItems[${lineIndex}].meta.mouldingRows`,
				expected: expectedMouldingRows,
				actual: actualMouldingRows,
			});
		}
	}
	for (const [lineIndex, actualLine] of actual.lineItems.entries()) {
		if (lineIndex < expected.lineItems.length) continue;
		fieldCount += 1;
		mismatches.push({
			path: `lineItems[${lineIndex}]`,
			expected: undefined,
			actual: actualLine,
		});
	}
	fieldCount += 1;
	const expectedDeliveryOption = deliveryOption(expected);
	const actualDeliveryOption = deliveryOption(actual);
	if (expectedDeliveryOption !== actualDeliveryOption) {
		mismatches.push({
			path: "form.deliveryOption",
			expected: expectedDeliveryOption,
			actual: actualDeliveryOption,
		});
	}
	fieldCount += 1;
	const expectedDeliveryCosts = deliveryCosts(expected);
	const actualDeliveryCosts = deliveryCosts(actual);
	if (!sameValue(expectedDeliveryCosts, actualDeliveryCosts)) {
		mismatches.push({
			path: "extraCosts",
			expected: expectedDeliveryCosts,
			actual: actualDeliveryCosts,
		});
	}
	fieldCount += 1;
	// Line UIDs are transient, so compare unresolved references by their line
	// position while separately checking that each reference still points to a
	// real line (or remains intentionally null).
	const unresolvedReferencesMatch = sameValue(
		unresolvedReferenceKeys(expected),
		unresolvedReferenceKeys(actual),
	);
	const unresolvedFactsMatch = sameValue(
		unresolvedFactKeys(expected),
		unresolvedFactKeys(actual),
	);
	if (!unresolvedReferencesMatch || !unresolvedFactsMatch) {
		mismatches.push({
			path: unresolvedReferencesMatch
				? "unresolved"
				: "unresolved.lineReferences",
			expected: {
				references: unresolvedReferenceKeys(expected),
				facts: unresolvedFactKeys(expected),
			},
			actual: {
				references: unresolvedReferenceKeys(actual),
				facts: unresolvedFactKeys(actual),
			},
		});
	}
	const unsafeGuessPaths = findUnsafeGuesses(expected, actual);
	const fieldMatches = fieldCount - mismatches.length;
	return {
		fieldMatches,
		fieldCount,
		fieldMatchRate: fieldCount ? fieldMatches / fieldCount : 1,
		wholeOrderMatch: mismatches.length === 0 && unsafeGuessPaths.length === 0,
		unsafeGuesses: unsafeGuessPaths.length,
		unsafeGuessPaths,
		latencyMs: telemetry.latencyMs,
		inputTokens: telemetry.inputTokens ?? null,
		outputTokens: telemetry.outputTokens ?? null,
		mismatches,
	};
}

function roundMilliseconds(value: number) {
	return Math.round(value * 100) / 100;
}

export async function evaluateSalesRequestFixture(
	fixture: RequestGenerationEvaluationFixture,
	provider: SalesRequestProvider,
): Promise<EvaluationCaseResult> {
	const startedAt = performance.now();
	try {
		const result = await generateNewSalesFormSeed(
			{
				text: fixture.text,
				images: [],
				signal: new AbortController().signal,
				configurationJson: fixture.configurationJson,
				configurationRevision: fixture.configurationRevision,
			},
			provider,
		);
		return {
			status: "ok",
			fixtureId: fixture.id,
			language: fixture.language,
			metrics: scoreNewSalesFormSeed(fixture.expected, result.seed, {
				latencyMs: roundMilliseconds(performance.now() - startedAt),
				inputTokens: result.usage.inputTokens,
				outputTokens: result.usage.outputTokens,
			}),
		};
	} catch (error) {
		return {
			status: "error",
			fixtureId: fixture.id,
			language: fixture.language,
			latencyMs: roundMilliseconds(performance.now() - startedAt),
			error: error instanceof Error ? error.message : "Evaluation case failed",
		};
	}
}

function sumKnownTokens(values: Array<number | null>) {
	if (values.some((value) => value === null)) return null;
	return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export async function evaluateSalesRequestFixtures(
	provider: SalesRequestProvider,
	fixtures: readonly RequestGenerationEvaluationFixture[] = EVALUATION_FIXTURES,
	mode: "mock" | "live" = "mock",
): Promise<EvaluationReport> {
	const cases: EvaluationCaseResult[] = [];
	for (const fixture of fixtures) {
		cases.push(await evaluateSalesRequestFixture(fixture, provider));
	}
	const successful = cases.filter(
		(result): result is Extract<EvaluationCaseResult, { status: "ok" }> =>
			result.status === "ok",
	);
	const fieldMatches = successful.reduce(
		(sum, result) => sum + result.metrics.fieldMatches,
		0,
	);
	const fieldCount = successful.reduce(
		(sum, result) => sum + result.metrics.fieldCount,
		0,
	);
	const latencyMs = roundMilliseconds(
		cases.reduce(
			(sum, result) =>
				sum +
				(result.status === "ok" ? result.metrics.latencyMs : result.latencyMs),
			0,
		),
	);
	const inputTokens = sumKnownTokens(
		successful.map((result) => result.metrics.inputTokens),
	);
	const outputTokens = sumKnownTokens(
		successful.map((result) => result.metrics.outputTokens),
	);
	const wholeOrderMatches = successful.filter(
		(result) => result.metrics.wholeOrderMatch,
	).length;
	return {
		mode,
		syntheticCorpus: true,
		cases,
		aggregate: {
			caseCount: cases.length,
			successCount: successful.length,
			errorCount: cases.length - successful.length,
			wholeOrderMatches,
			wholeOrderMatchRate: cases.length ? wholeOrderMatches / cases.length : 1,
			fieldMatches,
			fieldCount,
			fieldMatchRate: fieldCount ? fieldMatches / fieldCount : 1,
			unsafeGuesses: successful.reduce(
				(sum, result) => sum + result.metrics.unsafeGuesses,
				0,
			),
			latencyMs,
			averageLatencyMs: cases.length
				? roundMilliseconds(latencyMs / cases.length)
				: 0,
			inputTokens,
			outputTokens,
			usageComplete:
				successful.length > 0 && inputTokens !== null && outputTokens !== null,
		},
		note:
			mode === "mock"
				? "Mock provider returns hand-authored expected seeds. Scores validate the harness and contract, not model accuracy; token usage is unavailable in mock mode."
				: "Live results use the explicitly selected provider against the synthetic corpus only.",
	};
}

export function createFixtureProvider(
	fixtures: readonly RequestGenerationEvaluationFixture[] = EVALUATION_FIXTURES,
): SalesRequestProvider {
	return async (input: SalesRequestProviderInput) => {
		const fixture = fixtures.find((candidate) => candidate.text === input.text);
		if (!fixture)
			throw new Error(
				"No hand-authored evaluation fixture matched the request",
			);
		return { output: structuredClone(fixture.providerOutput) };
	};
}
