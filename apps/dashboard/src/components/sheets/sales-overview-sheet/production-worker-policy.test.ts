import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
	getWorkerProductionSubmissionProgress,
	shouldWarnWorkerProductionItemMaterialReview,
} from "./production-worker-policy";

describe("production worker item policy", () => {
	test("warns only the affected item when configured materials need review", () => {
		const readiness = {
			state: "blocked",
			blockers: [{ salesItemId: 12 }],
		};

		expect(
			shouldWarnWorkerProductionItemMaterialReview({ itemId: 12, readiness }),
		).toBe(true);
		expect(
			shouldWarnWorkerProductionItemMaterialReview({ itemId: 13, readiness }),
		).toBe(false);
	});

	test("does not block items whose inventory setup is missing", () => {
		expect(
			shouldWarnWorkerProductionItemMaterialReview({
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

	test("keeps material-review warnings nonblocking across worker submission surfaces", () => {
		for (const relativePath of [
			"./production-assignment-row.tsx",
			"./production-submit-form.tsx",
			"./production/v2/production-item-document.tsx",
		]) {
			const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
			expect(source.includes("Material verification")).toBe(true);
			expect(source.includes("materialBlocked")).toBe(false);
		}
	});
});
