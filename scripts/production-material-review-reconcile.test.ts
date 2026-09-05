import { describe, expect, it } from "bun:test";

import { withProductionMaterialReviewReadRetry } from "./production-material-review-reconcile";

const source = await Bun.file(
	new URL("./production-material-review-reconcile.ts", import.meta.url),
).text();

it("connects the tested sequential scan to the durable partial-report contract", () => {
	expect(source).toContain("await runProductionMaterialReviewScan({");
	expect(source).toContain("processedCandidateCount: rows.length");
	expect(source).toContain("lastSuccessfulReviewId");
	expect(source).toContain("stoppedEarly: stopReason !== null");
	expect(source).toContain("report.failures > 0 || report.stoppedEarly");
	expect(source).toContain('"--after-review-id"');
	expect(source).toContain('"--through-review-id"');
	expect(source).toContain('"--max-candidates"');
	expect(source).toContain("hasMoreCandidates");
});

describe("Production material-review reconciliation runner", () => {
	it("retries transient read failures with a fresh connection", async () => {
		let attempts = 0;
		let resets = 0;
		const result = await withProductionMaterialReviewReadRetry(
			async () => {
				attempts += 1;
				if (attempts < 3) {
					throw Object.assign(new Error("Server has closed the connection"), {
						code: "P1017",
					});
				}
				return "connected";
			},
			{
				attempts: 3,
				delayMs: 0,
				resetConnection: async () => {
					resets += 1;
				},
			},
		);

		expect(result).toBe("connected");
		expect(attempts).toBe(3);
		expect(resets).toBe(2);
	});

	it("rotates the reconciliation client after a retryable read failure", () => {
		expect(source).toContain(
			'import { createDatabaseClient, db } from "@gnd/db"',
		);
		expect(source).toContain("const failedDb = reconciliationDb");
		expect(source).toContain("reconciliationDb = createDatabaseClient()");
		expect(source).toContain("void failedDb.$disconnect().catch");
		expect(source).not.toContain("await failedDb.$disconnect()");
	});

	it("keeps repair mutations outside the automatic retry wrapper", () => {
		expect(source).toMatch(
			/decideProductionSubmissionMaterialReview\(\n\s+transactionDb,/,
		);
		expect(source).toContain("await runSalesPipelineCommandTransaction(");
		expect(source).toContain("retryOnWriteConflict: false");
		expect(source).toContain("enforce: true");
		expect(source).toMatch(
			/const repair = await applyProductionMaterialReviewHistoryRepair\(\n\s+reconciliationDb,/,
		);
		expect(source.match(/withProductionMaterialReviewReadRetry/g)).toHaveLength(
			5,
		);
	});
});
