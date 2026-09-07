import { describe, expect, it } from "bun:test";
import {
	buildProductionMaterialReviewRepairPlan,
	classifyProductionMaterialReviewActionability,
} from "@gnd/sales/production-submission-review";
import {
	productionMaterialReviewScanOperation,
	readReconciliationInteger,
	runProductionMaterialReviewScan,
} from "./production-material-review-scan";

describe("material-review reconciliation execution boundary", () => {
	it("stops on the real planner's ambiguous no-op before any later repair", async () => {
		const plan = buildProductionMaterialReviewRepairPlan({
			actionability: classifyProductionMaterialReviewActionability({
				reviewStatus: "PENDING",
				terminalOrder: false,
				activeSubmissionCount: 1,
				superseded: false,
				assignmentScopeIssues: [],
				materialStatus: "status_unknown",
			}),
			materialStatus: "status_unknown",
			storedReason: "PROJECTION_UNAVAILABLE",
		});
		let writes = 0;
		const result = await runProductionMaterialReviewScan({
			candidates: [{ id: 1 }, { id: 2 }],
			maxMutations: 2,
			load: async ({ id }) => ({
				operation:
					id === 1
						? productionMaterialReviewScanOperation(plan)
						: "approve_ready",
				enabled: true,
				apply: async () => {
					writes += 1;
					return true;
				},
			}),
			onFailure: () => {
				throw new Error("Unexpected failure");
			},
		});
		expect(plan.classification).toBe("ambiguous");
		expect(result.stopReason).toBe("unsafe_plan:1");
		expect(result.lastSuccessfulReviewId).toBeNull();
		expect(writes).toBe(0);
	});
	it("stops immediately on a failed read, with no later writes or reads", async () => {
		const events: string[] = [];
		const result = await runProductionMaterialReviewScan({
			candidates: [{ id: 1 }, { id: 2 }, { id: 3 }],
			maxMutations: 3,
			load: async ({ id }) => {
				events.push(`read:${id}`);
				if (id === 2) throw new Error("Connection lost");
				return {
					operation: "approve_ready",
					enabled: true,
					apply: async () => {
						events.push(`write:${id}`);
						return true;
					},
				};
			},
			onFailure: ({ id }, phase) => {
				events.push(`${phase}_failed:${id}`);
			},
		});
		expect(events).toEqual(["read:1", "write:1", "read:2", "read_failed:2"]);
		expect(result).toEqual({
			mutationCount: 1,
			lastSuccessfulReviewId: 1,
			stopReason: "unsafe_read:2",
		});
	});

	it("never advances the resume cursor beyond a repair skipped by the mutation budget", async () => {
		const writes: number[] = [];
		const result = await runProductionMaterialReviewScan({
			candidates: [{ id: 1 }, { id: 2 }, { id: 3 }],
			maxMutations: 1,
			load: async ({ id }) => ({
				operation: "approve_ready",
				enabled: true,
				apply: async () => {
					writes.push(id);
					return true;
				},
			}),
			onFailure: () => {
				throw new Error("Unexpected failure");
			},
		});
		expect(writes).toEqual([1]);
		expect(result).toEqual({
			mutationCount: 1,
			lastSuccessfulReviewId: 1,
			stopReason: "mutation_limit:2",
		});
	});

	for (const outcome of ["reject", "unchanged"] as const) {
		it(`does not retry or continue after a mutation ${outcome}`, async () => {
			let writes = 0;
			const failures: string[] = [];
			const result = await runProductionMaterialReviewScan({
				candidates: [{ id: 1 }, { id: 2 }],
				maxMutations: 2,
				load: async () => ({
					operation: "approve_ready",
					enabled: true,
					apply: async () => {
						writes += 1;
						if (outcome === "reject") throw new Error("Unacknowledged write");
						return false;
					},
				}),
				onFailure: ({ id }, phase) => {
					failures.push(`${phase}:${id}`);
				},
			});
			expect(writes).toBe(1);
			expect(failures).toEqual(["mutation:1"]);
			expect(result).toEqual({
				mutationCount: 0,
				lastSuccessfulReviewId: null,
				stopReason: "mutation_failure:1",
			});
		});
	}

	it("stops before unsafe plans and never invokes a disabled mutation", async () => {
		const reads: number[] = [];
		const result = await runProductionMaterialReviewScan({
			candidates: [{ id: 1 }, { id: 2 }, { id: 3 }],
			maxMutations: 3,
			load: async ({ id }) => {
				reads.push(id);
				return {
					operation: id === 2 ? "unsafe" : "approve_ready",
					enabled: false,
					apply: async () => {
						throw new Error("Must not write");
					},
				};
			},
			onFailure: () => {
				throw new Error("Unexpected failure");
			},
		});
		expect(reads).toEqual([1, 2]);
		expect(result).toEqual({
			mutationCount: 0,
			lastSuccessfulReviewId: 1,
			stopReason: "unsafe_plan:2",
		});
	});

	it("continues past unsafe plans only for an explicit read-only full audit", async () => {
		const reads: number[] = [];
		const result = await runProductionMaterialReviewScan({
			candidates: [{ id: 1 }, { id: 2 }, { id: 3 }],
			maxMutations: 0,
			continueAfterUnsafeForReadOnlyAudit: true,
			load: async ({ id }) => {
				reads.push(id);
				return {
					operation: id === 2 ? "unsafe" : "none",
					enabled: false,
					apply: async () => {
						throw new Error("Read-only audit must not write");
					},
				};
			},
			onFailure: () => {
				throw new Error("Unexpected failure");
			},
		});

		expect(reads).toEqual([1, 2, 3]);
		expect(result).toEqual({
			mutationCount: 0,
			lastSuccessfulReviewId: 3,
			stopReason: null,
			unsafeReviewIds: [2],
		});
	});

	it("fails closed if full-audit mode encounters any enabled mutation", async () => {
		let writes = 0;
		const result = await runProductionMaterialReviewScan({
			candidates: [{ id: 1 }, { id: 2 }],
			maxMutations: 2,
			continueAfterUnsafeForReadOnlyAudit: true,
			load: async () => ({
				operation: "approve_ready",
				enabled: true,
				apply: async () => {
					writes += 1;
					return true;
				},
			}),
			onFailure: () => {
				throw new Error("Unexpected failure callback");
			},
		});

		expect(writes).toBe(0);
		expect(result).toEqual({
			mutationCount: 0,
			lastSuccessfulReviewId: null,
			stopReason: "unsafe_audit_mutation_enabled:1",
			unsafeReviewIds: [],
		});
	});
});

describe("reconciliation scope validation", () => {
	for (const value of [
		"bad",
		"-1",
		"1.5",
		"Infinity",
		"",
		"--approve-ready",
		"9007199254740992",
	]) {
		it(`rejects invalid bounds (${value}) instead of dropping the bound`, () => {
			expect(() =>
				readReconciliationInteger(
					["--max-candidates", value],
					"--max-candidates",
					Number.POSITIVE_INFINITY,
					1,
				),
			).toThrow();
		});
	}
	it("preserves valid and omitted bounds", () => {
		expect(
			readReconciliationInteger(
				["--after-review-id", "103"],
				"--after-review-id",
				0,
			),
		).toBe(103);
		expect(
			readReconciliationInteger(
				[],
				"--max-candidates",
				Number.POSITIVE_INFINITY,
				1,
			),
		).toBe(Number.POSITIVE_INFINITY);
	});
});
