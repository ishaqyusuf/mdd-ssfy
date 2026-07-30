import { describe, expect, test } from "bun:test";
import {
	applyContractorIssueResolution,
	buildContractorIssueFingerprint,
} from "./resolution";

const issue = {
	id: "issue-1",
	code: "SUMMARY_MISMATCH",
	contractorId: 1,
	expectedAmount: "100.00",
	actualAmount: "90.00",
	differenceAmount: "-10.00",
	evidence: { actualCents: 9000, expectedCents: 10000 },
};

describe("contractor issue resolution", () => {
	test("makes a prior resolution stale when evidence changes", () => {
		const fingerprint = buildContractorIssueFingerprint(issue);
		expect(
			applyContractorIssueResolution({ ...issue, actualAmount: "95.00" }, [
				{
					id: 1,
					createdAt: "2026-08-01T00:00:00Z",
					data: {
						action: "resolved",
						fingerprint,
						resolution: "verified",
					},
				},
			]).resolutionStatus,
		).toBe("stale");
	});
});
