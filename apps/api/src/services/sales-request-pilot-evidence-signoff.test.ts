import { describe, expect, test } from "bun:test";
import { salesRequestPilotEvidenceSignoffSchema } from "./sales-request-pilot-evidence-signoff";

const validSignoff = {
	status: "verified" as const,
	reviewerUserId: 42,
	reviewedAt: "2026-09-13T10:00:00.000Z",
	evidenceDigest:
		"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	authorityMatched: true,
	benchmarkPassed: true,
	unsafeApplyCount: 0,
	ambiguousUnsupportedFactCount: 2,
	ambiguousUnsupportedVisibleCount: 2,
	saveReopenCheckedCount: 1,
	saveReopenSucceededCount: 1,
};

describe("sales request pilot evidence signoff", () => {
	test("enforces one strict aggregate-only canonical contract", () => {
		expect(salesRequestPilotEvidenceSignoffSchema.parse(validSignoff)).toEqual(
			validSignoff,
		);
		expect(
			salesRequestPilotEvidenceSignoffSchema.safeParse({
				...validSignoff,
				saveReopenSucceededCount: 2,
			}).success,
		).toBe(false);
		expect(
			salesRequestPilotEvidenceSignoffSchema.safeParse({
				...validSignoff,
				requestText: "must never persist",
			}).success,
		).toBe(false);
	});
});
