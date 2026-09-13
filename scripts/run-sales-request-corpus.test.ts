import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	consumeSalesRequestEvaluationApproval,
	createSalesRequestEvaluationApprovalPacket,
} from "../apps/api/src/services/request-generation/evaluation/approval";
import { createSalesRequestProviderAfterApproval } from "./run-sales-request-corpus";

const digest = "a".repeat(64);

function packet() {
	return createSalesRequestEvaluationApprovalPacket({
		runId: "2026-09-13T-runner-ordering-test",
		caseId: "interior-solid-core-slabs",
		provider: "deepseek",
		model: "deepseek-v4-flash",
		settingId: 3,
		configurationRevision: digest,
		promptVersion: "new-sales-form-seed-v6",
		outputContract: "new-sales-form-seed-v2",
		serviceVocabularyRevision: digest,
		maxOutputTokens: 4_000,
		maxRetries: 0,
		providerTimeoutMs: 45_000,
		pricingSnapshot: {
			schemaVersion: 1,
			provider: "deepseek",
			model: "deepseek-v4-flash",
			currency: "USD",
			effectiveAt: "2026-09-13",
			sourceDigest: `sha256:${digest}`,
			ratesPerMillionTokens: {
				inputMicros: 440_000,
				cachedInputMicros: 14_000,
				outputMicros: 1_320_000,
			},
			maxEstimatedCallCostMicros: 25_000,
		},
		artifacts: {
			configuration: "configuration",
			configurationSource: "configuration-source",
			factExpectations: "fact-expectations",
			modelInput: "model-input",
			evaluationRuntimeLock: "evaluation-runtime-lock",
			pricingSnapshot: "pricing-snapshot",
			pricingSource: "pricing-source",
			providerOracle: "provider-oracle",
			providerRuntimeOptions: "provider-runtime-options",
			request: "request",
			seedOracle: "seed-oracle",
		},
	});
}

describe("sales request corpus live approval ordering", () => {
	test("does not construct a provider when approval consumption fails", async () => {
		const directory = await mkdtemp(join(tmpdir(), "sales-request-runner-"));
		const path = join(directory, "approval-consumed.json");
		const approvedPacket = packet();
		await consumeSalesRequestEvaluationApproval({
			path,
			packet: approvedPacket,
			now: new Date("2026-09-13T12:00:00.000Z"),
		});

		let providerConstructed = false;
		await expect(
			createSalesRequestProviderAfterApproval({
				path,
				packet: approvedPacket,
				createProvider: () => {
					providerConstructed = true;
					return "provider";
				},
			}),
		).rejects.toThrow("already consumed");
		expect(providerConstructed).toBe(false);
	});
});
