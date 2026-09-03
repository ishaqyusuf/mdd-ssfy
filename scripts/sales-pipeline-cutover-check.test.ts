import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./sales-pipeline-cutover-check.ts", import.meta.url),
).text();

describe("Sales Pipeline cutover check", () => {
	it("requires measured shadow evidence and exposes a fact-preserving rollback", () => {
		expect(source).toContain("evaluateSalesPipelineCutoverGates");
		expect(source).toContain("unexplainedMembershipDifferences");
		expect(source).toContain("unsafeTransitionDifferences");
		expect(source).toContain("staleProjectionDifferences");
		expect(source).toContain("conflictSampleComplete");
		expect(source).toContain("operatorApproved");
		expect(source).toContain("preservesCommittedDomainFacts: true");
	});
});
