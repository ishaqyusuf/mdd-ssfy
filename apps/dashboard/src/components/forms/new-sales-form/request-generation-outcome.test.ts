import { describe, expect, test } from "bun:test";
import {
	buildSalesRequestGenerationFeedbackInput,
	createSalesRequestGenerationOutcomeTracker,
	getSalesRequestGenerationApplyOutcome,
	getSalesRequestGenerationSaveStage,
} from "./request-generation-outcome";

const generationId = "11111111-1111-4111-8111-111111111111";

describe("Sales Request Generation client outcome boundary", () => {
	test("maps completed apply results to the strict server outcomes", () => {
		expect(getSalesRequestGenerationApplyOutcome({ status: "applied" })).toBe(
			"applied",
		);
		expect(
			getSalesRequestGenerationApplyOutcome({ status: "already-applied" }),
		).toBe("applied");
		expect(
			getSalesRequestGenerationApplyOutcome({
				status: "configuration-stale",
			}),
		).toBe("stale");
		expect(
			getSalesRequestGenerationApplyOutcome({
				status: "blocked",
				reason: "unresolved",
			}),
		).toBe("blocked");
		expect(getSalesRequestGenerationApplyOutcome({ status: "error" })).toBe(
			"unavailable",
		);
	});

	test("records saves only after a generation was actually applied", async () => {
		const calls: unknown[] = [];
		const tracker = createSalesRequestGenerationOutcomeTracker(
			async (input) => {
				calls.push(input);
			},
		);

		expect(
			await tracker.recordSave(tracker.captureSave("draft"), "saved"),
		).toBe(false);
		expect(calls).toEqual([]);

		await tracker.recordApplyResult(generationId, { status: "blocked" });
		expect(
			await tracker.recordSave(tracker.captureSave("draft"), "failed"),
		).toBe(false);

		await tracker.recordApplyResult(generationId, { status: "applied" });
		expect(
			await tracker.recordSave(tracker.captureSave("draft"), "saved"),
		).toBe(true);
		expect(
			await tracker.recordSave(tracker.captureSave("final"), "failed"),
		).toBe(true);
		expect(calls).toEqual([
			{
				generationId,
				kind: "apply",
				outcome: "blocked",
			},
			{
				generationId,
				kind: "apply",
				outcome: "applied",
			},
			{
				generationId,
				kind: "save",
				stage: "draft",
				outcome: "saved",
			},
			{
				generationId,
				kind: "save",
				stage: "final",
				outcome: "failed",
			},
		]);
	});

	test("keeps best-effort telemetry failures outside the native workflow", async () => {
		const tracker = createSalesRequestGenerationOutcomeTracker(async () => {
			throw new Error("telemetry unavailable");
		});

		expect(
			await tracker.recordApplyResult(generationId, { status: "applied" }),
		).toBe(false);
		expect(
			await tracker.recordSave(tracker.captureSave("draft"), "saved"),
		).toBe(false);
	});

	test("binds a save outcome to the generation active when the save started", async () => {
		const calls: unknown[] = [];
		const tracker = createSalesRequestGenerationOutcomeTracker(
			async (input) => {
				calls.push(input);
			},
		);
		await tracker.recordApplyResult(generationId, { status: "applied" });
		const attribution = tracker.captureSave("draft");
		await tracker.recordApplyResult("22222222-2222-4222-8222-222222222222", {
			status: "applied",
		});

		await tracker.recordSave(attribution, "saved");

		expect(calls.at(-1)).toEqual({
			generationId,
			kind: "save",
			stage: "draft",
			outcome: "saved",
		});
	});

	test("clears the applied generation after undo and maps native save intents", async () => {
		const calls: unknown[] = [];
		const tracker = createSalesRequestGenerationOutcomeTracker(
			async (input) => {
				calls.push(input);
			},
		);
		await tracker.recordApplyResult(generationId, { status: "applied" });
		tracker.clearAppliedGeneration(generationId);
		expect(
			await tracker.recordSave(tracker.captureSave("final"), "saved"),
		).toBe(false);
		expect(getSalesRequestGenerationSaveStage("autosave")).toBe("draft");
		expect(getSalesRequestGenerationSaveStage("draft")).toBe("draft");
		expect(getSalesRequestGenerationSaveStage("close")).toBe("draft");
		expect(getSalesRequestGenerationSaveStage("new")).toBe("draft");
		expect(getSalesRequestGenerationSaveStage("final")).toBe("final");
	});

	test("builds category-only feedback with no request content or seed", () => {
		expect(
			buildSalesRequestGenerationFeedbackInput({
				generationId,
				outcome: "accepted-with-edits",
				issueCategories: ["ambiguous"],
				changedFieldCategories: ["quantities", "line-items", "quantities"],
			}),
		).toEqual({
			generationId,
			kind: "feedback",
			outcome: "accepted-with-edits",
			issueCategories: [],
			changedFieldCategories: ["line-items", "quantities"],
		});
		expect(
			buildSalesRequestGenerationFeedbackInput({
				generationId,
				outcome: "rejected",
				issueCategories: [],
				changedFieldCategories: [],
			}),
		).toBe(null);
		const accepted = buildSalesRequestGenerationFeedbackInput({
			generationId,
			outcome: "accepted",
			issueCategories: ["other"],
			changedFieldCategories: ["other"],
		});
		expect(accepted).toEqual({
			generationId,
			kind: "feedback",
			outcome: "accepted",
			issueCategories: [],
			changedFieldCategories: [],
		});
		for (const forbidden of [
			"text",
			"source",
			"seed",
			"image",
			"contact",
			"provider",
		]) {
			expect(JSON.stringify(accepted).toLowerCase()).not.toContain(forbidden);
		}
		expect(
			buildSalesRequestGenerationFeedbackInput({
				generationId,
				outcome: "rejected",
				issueCategories: ["wrong-component", "unsafe-selection"],
				changedFieldCategories: [],
			}),
		).toMatchObject({
			issueCategories: ["unsafe-selection", "wrong-component"],
		});
	});
});
