import { describe, expect, test } from "bun:test";
import { buildContractorCloseReadiness } from "./close-readiness";

describe("contractor accounting close readiness", () => {
	test("blocks close for unresolved or stale evidence", () => {
		const readiness = buildContractorCloseReadiness({
			hasCompletedReconciliation: true,
			reconciliationMatches: true,
			openIssueCount: 0,
			staleResolutionCount: 1,
			legacyDateFallbackCount: 2,
			missingContractorNameCount: 0,
			missingPayoutDateCount: 0,
			reconciliationDifferenceCents: 0,
		});
		expect(readiness.ready).toBe(false);
		expect(readiness.blockerCount).toBe(1);
		expect(readiness.warningCount).toBe(1);
	});
});
