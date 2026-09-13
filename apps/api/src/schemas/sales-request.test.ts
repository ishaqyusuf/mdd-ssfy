import { expect, test } from "bun:test";
import {
	generateSalesRequestPreviewSchema,
	recordSalesRequestGenerationOutcomeSchema,
	salesRequestGenerationPilotSummarySchema,
	setSalesRequestDefaultSchema,
	setSalesRequestProviderBenchmarkApprovalSchema,
	validateSalesRequestPreviewSchema,
} from "./sales-request";

test("preview accepts only typed pasted text during the text pilot", () => {
	expect(
		generateSalesRequestPreviewSchema.parse({
			type: "order",
			text: "one door",
		}).images,
	).toEqual([]);
	expect(
		generateSalesRequestPreviewSchema.safeParse({ text: "one door" }).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({ type: "order", text: " " })
			.success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			type: "order",
			text: "one door",
			settingId: 3,
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			type: "order",
			text: "one door",
			customerProfileId: 17,
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			type: "order",
			images: [{ url: "https://example.com/image.png" }],
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			type: "order",
			text: "one door",
			images: [{ mediaType: "image/png", base64: "YWJjZA==" }],
		}).success,
	).toBe(false);
});

test("does not expose a dormant image payload contract during the text pilot", () => {
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			type: "order",
			images: [{ mediaType: "image/svg+xml", base64: "YWJjZA==" }],
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			type: "order",
			images: [
				{ mediaType: "image/png", base64: "data:image/png;base64,YWJjZA==" },
			],
		}).success,
	).toBe(false);
});

test("preview validation accepts only the server-issued configuration identity", () => {
	expect(
		validateSalesRequestPreviewSchema.parse({
			type: "quote",
			configurationScope: "sales-settings:7",
			configurationRevision: "a".repeat(64),
			provider: "deepseek",
			model: "deepseek-chat",
		}),
	).toEqual({
		type: "quote",
		configurationScope: "sales-settings:7",
		configurationRevision: "a".repeat(64),
		provider: "deepseek",
		model: "deepseek-chat",
	});
	expect(
		validateSalesRequestPreviewSchema.safeParse({
			type: "quote",
			configurationScope: "sales-settings:7",
			configurationRevision: "a".repeat(64),
			provider: "deepseek",
			model: "deepseek-chat",
			settingId: 7,
		}).success,
	).toBe(false);
});

test("default writes accept a nullable component UID but never a client setting ID", () => {
	expect(
		setSalesRequestDefaultSchema.parse({
			rootUid: "root",
			stepUid: "step",
			componentUid: null,
		}),
	).toEqual({ rootUid: "root", stepUid: "step", componentUid: null });
	expect(
		setSalesRequestDefaultSchema.safeParse({
			rootUid: "root",
			stepUid: "step",
			componentUid: "component",
			settingId: 7,
		}).success,
	).toBe(false);
});

test("benchmark decisions accept bounded evidence but never client actor metadata", () => {
	const decision = {
		approved: true,
		provider: "openai" as const,
		model: "gpt-5-mini",
		evaluationRunId: "2026-09-13T120000Z-openai-v1",
		corpusVersion: "sales-request-text-v1",
		policyVersion: "pilot-gates-v1",
		configurationRevision: "c".repeat(64),
		promptVersion: "new-sales-form-seed-v6",
		schemaVersion: 2,
		evidenceDigest: `sha256:${"a".repeat(64)}`,
	};
	expect(
		setSalesRequestProviderBenchmarkApprovalSchema.parse(decision),
	).toEqual(decision);
	expect(
		setSalesRequestProviderBenchmarkApprovalSchema.safeParse({
			...decision,
			approvedByUserId: 99,
		}).success,
	).toBe(false);
	expect(
		setSalesRequestProviderBenchmarkApprovalSchema.safeParse({
			...decision,
			model: "deepseek-v4-flash",
		}).success,
	).toBe(false);
});

test("generation outcomes are strict, bounded, and contain no content fields", () => {
	const generationId = "11111111-1111-4111-8111-111111111111";
	expect(
		recordSalesRequestGenerationOutcomeSchema.parse({
			generationId,
			kind: "apply",
			outcome: "applied",
		}),
	).toEqual({ generationId, kind: "apply", outcome: "applied" });
	expect(
		recordSalesRequestGenerationOutcomeSchema.parse({
			generationId,
			kind: "feedback",
			outcome: "accepted-with-edits",
			issueCategories: ["ambiguous"],
			changedFieldCategories: ["line-items"],
		}),
	).toMatchObject({ issueCategories: ["ambiguous"] });
	expect(
		recordSalesRequestGenerationOutcomeSchema.safeParse({
			generationId,
			kind: "feedback",
			outcome: "rejected",
			issueCategories: Array.from({ length: 13 }, () => "ambiguous"),
			changedFieldCategories: [],
		}).success,
	).toBe(false);
	for (const field of ["text", "source", "image", "providerBody", "contact"]) {
		expect(
			recordSalesRequestGenerationOutcomeSchema.safeParse({
				generationId,
				kind: "apply",
				outcome: "applied",
				[field]: "private",
			}).success,
		).toBe(false);
	}
});

test("pilot summary input is server-bounded", () => {
	expect(salesRequestGenerationPilotSummarySchema.parse({})).toEqual({
		days: 30,
	});
	expect(
		salesRequestGenerationPilotSummarySchema.safeParse({ days: 91 }).success,
	).toBe(false);
	expect(
		salesRequestGenerationPilotSummarySchema.safeParse({
			days: 30,
			actorUserId: 7,
		}).success,
	).toBe(false);
});
