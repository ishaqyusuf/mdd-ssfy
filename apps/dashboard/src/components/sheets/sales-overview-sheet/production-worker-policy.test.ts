import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { getWorkerProductionSubmissionProgress } from "./production-worker-policy";

describe("production worker item policy", () => {
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

	test("keeps material review silent across submission surfaces", () => {
		for (const relativePath of [
			"./production-assignment-row.tsx",
			"./production-submit-form.tsx",
			"./production-submissions.tsx",
			"./production/v2/production-item-document.tsx",
		]) {
			const source = readFileSync(
				new URL(relativePath, import.meta.url),
				"utf8",
			);
			expect(source.includes("Material verification")).toBe(false);
			expect(source.includes("Submitted for admin verification")).toBe(false);
			expect(source.includes("materialBlocked")).toBe(false);
			expect(source.includes("Materials approved")).toBe(false);
			expect(source.includes("Awaiting material approval")).toBe(false);
		}

		const sharedProductionSource = readFileSync(
			new URL("../../production-v2/shared.tsx", import.meta.url),
			"utf8",
		);
		expect(sharedProductionSource.includes("Material review approved")).toBe(
			false,
		);
		expect(
			sharedProductionSource.includes("Submitted · awaiting admin review"),
		).toBe(false);
		expect(sharedProductionSource).toContain(
			'scope === "admin" && progress.isAwaitingReview',
		);
		expect(sharedProductionSource).toContain("All assigned work submitted");
	});

	test("uses the assignment ledger presentation for worker submissions", () => {
		const source = readFileSync(
			new URL("./production-assignment-row.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain('<ProductionSubmissions presentation="ledger" />');
	});
});
