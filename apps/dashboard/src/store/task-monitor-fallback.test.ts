import { describe, expect, test } from "bun:test";

import {
	type TaskMonitorTask,
	enqueuePendingSalesCompletionFallback,
	getPendingSalesCompletionFallback,
} from "./task-monitor";

function productionTask(
	requestId = "a818581e-6e44-43c6-a955-e2e68cc02314",
	runId = "run-1",
): TaskMonitorTask {
	return {
		id: runId,
		runId,
		accessToken: "public-token",
		ownerId: "19",
		status: "SYNCING",
		intent: {
			name: "sales.mark-as-production-completed",
			version: 1,
			args: {
				requestId,
				salesIds: [41],
			},
		},
		createdAt: 1,
		updatedAt: 1,
	};
}

describe("persisted Sales completion fallback task handoff", () => {
	test("creates a recoverable attempt when the completed output has issues", () => {
		expect(
			getPendingSalesCompletionFallback(productionTask(), {
				requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
				failed: 1,
				awaitingReview: 0,
			}),
		).toMatchObject({
			id: "PRODUCTION_COMPLETED:a818581e-6e44-43c6-a955-e2e68cc02314",
			runId: "run-1",
			ownerId: "19",
			milestone: "PRODUCTION_COMPLETED",
			fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
		});
	});

	test("does not prompt after a fully successful output", () => {
		expect(
			getPendingSalesCompletionFallback(productionTask(), {
				requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
				failed: 0,
				awaitingReview: 0,
			}),
		).toBeNull();
	});

	test("recovers the request identity from persisted intent after navigation", () => {
		expect(
			getPendingSalesCompletionFallback(productionTask(), undefined),
		).toMatchObject({
			milestone: "PRODUCTION_COMPLETED",
			fullWorkflowRequestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
		});
	});

	test("keeps the active FIFO attempt stable when another task finishes", () => {
		const first = getPendingSalesCompletionFallback(
			productionTask(),
			undefined,
		);
		const second = getPendingSalesCompletionFallback(
			productionTask("7bbfb356-aec8-474f-a779-368c566595d0", "run-2"),
			undefined,
		);
		expect(first).not.toBeNull();
		expect(second).not.toBeNull();
		const queued =
			first && second
				? enqueuePendingSalesCompletionFallback(
						enqueuePendingSalesCompletionFallback([], first),
						second,
					)
				: [];
		expect(queued.map((item) => item.id)).toEqual([first?.id, second?.id]);
	});

	test("never evicts an unresolved active attempt when the queue exceeds ten", () => {
		const attempts = Array.from({ length: 11 }, (_, index) => ({
			id: `PRODUCTION_COMPLETED:request-${index}`,
			runId: `run-${index}`,
			ownerId: "19",
			milestone: "PRODUCTION_COMPLETED" as const,
			fullWorkflowRequestId: `request-${index}`,
			createdAt: index,
		}));
		const queued = attempts.reduce(
			(current, attempt) =>
				enqueuePendingSalesCompletionFallback(current, attempt),
			[] as typeof attempts,
		);
		expect(queued).toHaveLength(11);
		expect(queued[0]).toEqual(attempts[0]);
	});
});
