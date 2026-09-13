"use client";

import { useCallback, useRef } from "react";
import { useSalesRequestRecordOutcomeMutation } from "./api";
import type { SalesRequestGenerationApplyResult } from "./request-generation-apply";
import {
	type SalesRequestGenerationFeedbackSelection,
	type SalesRequestGenerationSaveIntent,
	createSalesRequestGenerationOutcomeTracker,
	getSalesRequestGenerationSaveStage,
} from "./request-generation-outcome";

export function useSalesRequestGenerationOutcome() {
	const mutation = useSalesRequestRecordOutcomeMutation();
	const mutateRef = useRef(mutation.mutateAsync);
	mutateRef.current = mutation.mutateAsync;
	const trackerRef = useRef<ReturnType<
		typeof createSalesRequestGenerationOutcomeTracker
	> | null>(null);
	if (!trackerRef.current) {
		trackerRef.current = createSalesRequestGenerationOutcomeTracker((input) =>
			mutateRef.current(input),
		);
	}
	const tracker = trackerRef.current;

	const recordApplyResult = useCallback(
		(generationId: string, result: SalesRequestGenerationApplyResult) =>
			tracker.recordApplyResult(generationId, result),
		[tracker],
	);
	const captureSave = useCallback(
		(intent: SalesRequestGenerationSaveIntent) =>
			tracker.captureSave(getSalesRequestGenerationSaveStage(intent)),
		[tracker],
	);
	const recordSave = useCallback(
		(
			attribution: ReturnType<typeof tracker.captureSave>,
			outcome: "saved" | "failed",
		) => tracker.recordSave(attribution, outcome),
		[tracker],
	);
	const recordFeedback = useCallback(
		(input: SalesRequestGenerationFeedbackSelection) =>
			tracker.recordFeedback(input),
		[tracker],
	);
	const clearAppliedGeneration = useCallback(
		(generationId: string) => tracker.clearAppliedGeneration(generationId),
		[tracker],
	);

	return {
		recordApplyResult,
		captureSave,
		recordSave,
		recordFeedback,
		clearAppliedGeneration,
	};
}
