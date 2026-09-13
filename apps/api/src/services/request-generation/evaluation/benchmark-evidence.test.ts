import { describe, expect, test } from "bun:test";
import {
	type SalesRequestEvaluationApprovalArtifacts,
	createSalesRequestEvaluationApprovalPacket,
} from "./approval";
import {
	finalizeSalesRequestBenchmarkEvidence,
	verifySalesRequestBenchmarkFinalEvidence,
} from "./benchmark-evidence";

const hex = "a".repeat(64);

function json(value: unknown) {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function requiredArtifact(artifacts: Record<string, string>, path: string) {
	const value = artifacts[path];
	if (value === undefined) throw new Error(`Missing test artifact: ${path}`);
	return value;
}

function fixture() {
	const caseId = "interior-solid-core-slabs";
	const approvalArtifacts: SalesRequestEvaluationApprovalArtifacts = {
		configuration: json({ routes: [] }),
		configurationSource: json({ routes: [] }),
		evaluationRuntimeLock: json({ schemaVersion: 1, files: [] }),
		factExpectations: json({
			shelfItemsExcluded: true,
			facts: [
				{
					id: "door-width",
					family: "door-hpt",
					classification: "supported",
					description: "Explicit door width",
					provider: { path: "lineItems[0].qty", value: 1 },
					seed: { path: "lineItems[0].qty", value: 1 },
				},
			],
		}),
		modelInput: json({ messages: [] }),
		pricingSnapshot: json({
			schemaVersion: 1,
			provider: "deepseek",
			model: "deepseek-v4-flash",
			currency: "USD",
			effectiveAt: "2026-09-13",
			sourceDigest: `sha256:${hex}`,
			ratesPerMillionTokens: {
				inputMicros: 440_000,
				cachedInputMicros: 14_000,
				outputMicros: 1_320_000,
			},
			maxEstimatedCallCostMicros: 25_000,
		}),
		pricingSource: "official pricing evidence\n",
		providerOracle: json({ schemaVersion: 2, lineItems: [], unresolved: [] }),
		providerRuntimeOptions: json({ deepseek: { thinking: "disabled" } }),
		request: json({ caseId, text: "sanitized request" }),
		seedOracle: json({ schemaVersion: 2, lineItems: [], unresolved: [] }),
	};
	const pricingSnapshot = JSON.parse(approvalArtifacts.pricingSnapshot);
	const approval = createSalesRequestEvaluationApprovalPacket({
		runId: "2026-09-13T-reviewed-case",
		caseId,
		provider: "deepseek",
		model: "deepseek-v4-flash",
		settingId: 3,
		configurationRevision: hex,
		promptVersion: "new-sales-form-seed-v6",
		outputContract: "new-sales-form-seed-v2",
		serviceVocabularyRevision: hex,
		maxOutputTokens: 4_000,
		maxRetries: 0,
		providerTimeoutMs: 45_000,
		pricingSnapshot,
		artifacts: approvalArtifacts,
	});
	const bucket = { expected: 1, matched: 1, matchRate: 1 };
	const artifacts: Record<string, string> = {
		"approval.json": json(approval),
		"approval-consumed.json": json({
			schemaVersion: 1,
			runId: approval.scope.runId,
			caseId,
			provider: "deepseek",
			model: "deepseek-v4-flash",
			approvalDigest: approval.approvalDigest,
			approvedCallLimit: 1,
			consumedAt: "2026-09-13T12:00:00.000Z",
		}),
		"configuration.json": approvalArtifacts.configuration,
		"configuration-source.json": approvalArtifacts.configurationSource,
		"evaluation-runtime-lock.json": approvalArtifacts.evaluationRuntimeLock,
		"execution.json": json({
			schemaVersion: 1,
			mode: "live",
			runId: approval.scope.runId,
			provider: "deepseek",
			model: "deepseek-v4-flash",
			caseId,
			approvalDigest: approval.approvalDigest,
			maxRetries: 0,
			startedAt: "2026-09-13T12:00:00.000Z",
		}),
		"pricing-snapshot.json": approvalArtifacts.pricingSnapshot,
		"pricing-source.md": approvalArtifacts.pricingSource,
		"provider-runtime-options.json": approvalArtifacts.providerRuntimeOptions,
		[`${caseId}/fact-expectations.json`]: approvalArtifacts.factExpectations,
		[`${caseId}/model-input.json`]: approvalArtifacts.modelInput,
		[`${caseId}/oracle-provider-output.json`]: approvalArtifacts.providerOracle,
		[`${caseId}/oracle-seed.json`]: approvalArtifacts.seedOracle,
		[`${caseId}/request.json`]: approvalArtifacts.request,
		[`${caseId}/provider-output.json`]: json({ schemaVersion: 2 }),
		[`${caseId}/provider-return.json`]: json({
			schemaVersion: 1,
			receivedAt: "2026-09-13T12:00:01.000Z",
			provider: "deepseek",
			model: "deepseek-v4-flash",
			inputTokens: 100,
			outputTokens: 20,
			output: { schemaVersion: 2 },
		}),
		[`${caseId}/seed.json`]: json({ schemaVersion: 2 }),
		[`${caseId}/validation.json`]: json({
			status: "passed",
			facts: "passed",
			normalization: "passed",
			initializer: "passed",
			saveReopen: "passed",
			issues: [],
		}),
		[`${caseId}/metrics.json`]: json({
			latencyMs: 800,
			inputTokens: 100,
			outputTokens: 20,
			factExpectations: {
				provider: {
					all: bucket,
					supportedAccuracy: bucket,
					ambiguousUnsupportedContainment: {
						expected: 0,
						matched: 0,
						matchRate: null,
					},
					byClassification: {},
					byFamily: {},
				},
				seed: {
					all: bucket,
					supportedAccuracy: bucket,
					ambiguousUnsupportedContainment: {
						expected: 0,
						matched: 0,
						matchRate: null,
					},
					byClassification: {},
					byFamily: {},
				},
			},
			providerOracle: { wholeOrderMatch: true, unsafeGuesses: 0 },
			seedOracle: { wholeOrderMatch: true, unsafeGuesses: 0 },
		}),
		[`${caseId}/cost-estimate.json`]: json({
			status: "within-ceiling",
			evaluable: true,
			minimumCostMicros: 71,
			maximumCostMicros: 71,
			withinCeiling: true,
		}),
		[`${caseId}/review.json`]: json({
			schemaVersion: 1,
			status: "completed",
			runId: approval.scope.runId,
			caseId,
			provider: "deepseek",
			model: "deepseek-v4-flash",
			reviewerUserId: 7,
			reviewedAt: "2026-09-13T13:00:00.000Z",
			decision: "continue",
			factReviews: [
				{
					factId: "door-width",
					provider: "correct",
					normalized: "correct",
					safety: "safe",
				},
			],
			correction: {
				method: "none",
				durationMs: 0,
				changedFieldCategories: [],
			},
			nativeSaveReopen: "passed",
			stopReasons: [],
		}),
	};
	return { artifacts, caseId };
}

describe("final Sales Request benchmark evidence", () => {
	test("binds complete approved artifacts and human review into one digest", () => {
		const input = fixture();
		const evidence = finalizeSalesRequestBenchmarkEvidence(input);
		expect(evidence).toMatchObject({
			status: "finalized",
			review: { decision: "continue", unsafeFactCount: 0 },
			metrics: {
				inputTokens: 100,
				outputTokens: 20,
				withinCostCeiling: true,
			},
		});
		expect(evidence.evidenceDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(
			verifySalesRequestBenchmarkFinalEvidence({
				...input,
				finalEvidence: structuredClone(evidence),
			}),
		).toEqual(evidence);
	});

	test("rejects tampered approved artifacts and incomplete human fact review", () => {
		const tampered = fixture();
		tampered.artifacts[`${tampered.caseId}/model-input.json`] = "{}\n";
		expect(() => finalizeSalesRequestBenchmarkEvidence(tampered)).toThrow(
			"Approved artifact changed",
		);

		const incomplete = fixture();
		incomplete.artifacts[`${incomplete.caseId}/review.json`] = json({
			...JSON.parse(
				requiredArtifact(
					incomplete.artifacts,
					`${incomplete.caseId}/review.json`,
				),
			),
			factReviews: [],
		});
		expect(() => finalizeSalesRequestBenchmarkEvidence(incomplete)).toThrow();
	});

	test("requires the durable provider return to match output and token metrics", () => {
		const missing = fixture();
		delete missing.artifacts[`${missing.caseId}/provider-return.json`];
		expect(() => finalizeSalesRequestBenchmarkEvidence(missing)).toThrow(
			"requires a durable provider return",
		);

		const outputMismatch = fixture();
		const returnPath = `${outputMismatch.caseId}/provider-return.json`;
		const providerReturn = JSON.parse(
			requiredArtifact(outputMismatch.artifacts, returnPath),
		);
		providerReturn.output = { schemaVersion: 1 };
		outputMismatch.artifacts[returnPath] = json(providerReturn);
		expect(() => finalizeSalesRequestBenchmarkEvidence(outputMismatch)).toThrow(
			"does not match the durable return",
		);

		const tokenMismatch = fixture();
		const tokenReturnPath = `${tokenMismatch.caseId}/provider-return.json`;
		const tokenReturn = JSON.parse(
			requiredArtifact(tokenMismatch.artifacts, tokenReturnPath),
		);
		tokenReturn.inputTokens = 99;
		tokenMismatch.artifacts[tokenReturnPath] = json(tokenReturn);
		expect(() => finalizeSalesRequestBenchmarkEvidence(tokenMismatch)).toThrow(
			"token metrics do not match",
		);
	});

	test("prevents continuation with unsafe or incomplete cost evidence", () => {
		const unsafe = fixture();
		const reviewPath = `${unsafe.caseId}/review.json`;
		const review = JSON.parse(requiredArtifact(unsafe.artifacts, reviewPath));
		review.factReviews[0].safety = "unsafe";
		unsafe.artifacts[reviewPath] = json(review);
		expect(() => finalizeSalesRequestBenchmarkEvidence(unsafe)).toThrow(
			"cannot continue",
		);

		const unknownCost = fixture();
		unknownCost.artifacts[`${unknownCost.caseId}/cost-estimate.json`] = json({
			status: "not-evaluable",
			evaluable: false,
			minimumCostMicros: null,
			maximumCostMicros: null,
			withinCeiling: null,
		});
		expect(() => finalizeSalesRequestBenchmarkEvidence(unknownCost)).toThrow(
			"cost and token evidence must be complete",
		);
	});

	test("finalizes a reviewed stopped provider failure without inventing metrics", () => {
		const stopped = fixture();
		const reviewPath = `${stopped.caseId}/review.json`;
		const review = JSON.parse(requiredArtifact(stopped.artifacts, reviewPath));
		review.decision = "stop";
		review.stopReasons = ["provider-error"];
		review.factReviews[0].provider = "not-produced";
		review.factReviews[0].normalized = "not-produced";
		stopped.artifacts[reviewPath] = json(review);
		stopped.artifacts[`${stopped.caseId}/metrics.json`] = json({
			latencyMs: 45_000,
			providerFailure: { stage: "provider-api", statusCode: 429 },
		});
		stopped.artifacts[`${stopped.caseId}/validation.json`] = json({
			status: "failed",
			error: "The AI provider operation failed.",
			hydration: "not-run",
		});
		stopped.artifacts[`${stopped.caseId}/cost-estimate.json`] = json({
			status: "not-evaluable",
			evaluable: false,
			minimumCostMicros: null,
			maximumCostMicros: null,
			withinCeiling: null,
		});

		expect(finalizeSalesRequestBenchmarkEvidence(stopped)).toMatchObject({
			review: { decision: "stop" },
			metrics: {
				providerSupportedAccuracy: null,
				inputTokens: null,
				minimumCostMicros: null,
				withinCostCeiling: null,
			},
		});
	});
});
