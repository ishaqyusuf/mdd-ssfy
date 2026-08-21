import { describe, expect, test } from "bun:test";

import {
	getWorkerProductionSubmissionProgress,
	isWorkerProductionItemSubmissionBlocked,
} from "./production-worker-policy";

describe("production worker item policy", () => {
	test("blocks only the affected item when configured materials are unavailable", () => {
		const readiness = {
			state: "blocked",
			blockers: [{ salesItemId: 12 }],
		};

		expect(
			isWorkerProductionItemSubmissionBlocked({ itemId: 12, readiness }),
		).toBe(true);
		expect(
			isWorkerProductionItemSubmissionBlocked({ itemId: 13, readiness }),
		).toBe(false);
	});

	test("does not block items whose inventory setup is missing", () => {
		expect(
			isWorkerProductionItemSubmissionBlocked({
				itemId: 12,
				readiness: { state: "not_configured", blockers: [] },
			}),
		).toBe(false);
	});

	test("uses reported worker quantity for the submissions label", () => {
		expect(
			getWorkerProductionSubmissionProgress({
				analytics: {
					reportedSubmitQty: 2,
					stats: {
						prodAssigned: { qty: 3 },
						prodCompleted: { qty: 1 },
					},
				},
			}),
		).toEqual({ assigned: 3, submitted: 2 });
	});
});
