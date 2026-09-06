import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./sales-pipeline-cutover-check.ts", import.meta.url),
).text();
const turboConfig = (await Bun.file(
	new URL("../turbo.json", import.meta.url),
).json()) as { tasks?: { build?: { env?: string[] } } };

describe("Sales Pipeline cutover check", () => {
	it("requires measured shadow evidence and exposes a fact-preserving rollback", () => {
		expect(source).toContain('contract: "sales-pipeline-cutover-gate/v2"');
		expect(source).toContain("evaluateSalesPipelineCutoverGates");
		expect(source).toContain("comparedOrders");
		expect(source).toContain("unexplainedMembershipDifferences");
		expect(source).toContain("unsafeTransitionDifferences");
		expect(source).toContain("staleProjectionDifferences");
		expect(source).toContain("conflictSampleComplete");
		expect(source).toContain("operatorApproved");
		expect(source).toContain("preservesCommittedDomainFacts: true");
		expect(source).toContain("reconciliation");
	});

	it("passes bounded rollout controls through the production build boundary", () => {
		expect(turboConfig.tasks?.build?.env).toEqual(
			expect.arrayContaining([
				"SALES_PIPELINE_READ_MODE",
				"SALES_PIPELINE_COMMAND_MODE",
				"SALES_PIPELINE_COHORT_PERCENT",
				"GND_SALES_ORDERS_READ_MODEL_MODE",
				"GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE",
			]),
		);
	});
});
