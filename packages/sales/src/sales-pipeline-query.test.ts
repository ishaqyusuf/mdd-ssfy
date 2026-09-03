import { describe, expect, it } from "bun:test";
import {
	buildCanonicalSalesPipelineFilterWhere,
	buildCustomerSalesPipelineProjectionFilter,
} from "./sales-pipeline-query";

describe("canonical Sales Pipeline database queries", () => {
	it("uses the versioned canonical projection instead of legacy lifecycle fields", () => {
		const where = buildCanonicalSalesPipelineFilterWhere({
			productionStatus: "due today",
			fulfillmentCompletion: "pending",
		});
		const serialized = JSON.stringify(where);
		expect(serialized).toContain(
			'"pipelineContractVersion":"sales-pipeline/v2"',
		);
		expect(serialized).toContain(
			'"pipelineProductionApplicability":"required"',
		);
		expect(serialized).toContain('"pipelineFulfillmentState"');
		expect(serialized).toContain('"assignments"');
		expect(serialized).toContain('"in_production"');
		expect(serialized).not.toContain('"administratively_completed"');
		expect(serialized).not.toContain('"prodCompleted"');
		expect(serialized).not.toContain('"dispatchCompleted"');
	});

	it("owns customer/dealer status membership in the sales package", () => {
		expect(buildCustomerSalesPipelineProjectionFilter("delivered")).toEqual({
			contractVersion: "sales-pipeline/v2",
			projectionVersion: 5,
			headlineIn: ["fulfilled"],
		});
		expect(
			buildCustomerSalesPipelineProjectionFilter("processing"),
		).toMatchObject({
			headlineNotIn: ["cancelled", "fulfilled", "in_transit"],
		});
	});

	it("intersects independent lifecycle filters and includes every nonterminal completion state", () => {
		const where = buildCanonicalSalesPipelineFilterWhere({
			production: "in progress",
			productionCompletion: "pending",
			fulfillmentCompletion: "pending",
		});
		const projection = (
			(where.AND as Array<Record<string, unknown>>)[0]?.listProjection as {
				is: { AND: Array<Record<string, unknown>> };
			}
		).is;
		expect(projection.AND).toContainEqual({
			pipelineProductionState: { in: ["in_production", "awaiting_review"] },
		});
		expect(projection.AND).toContainEqual({
			pipelineProductionState: {
				in: [
					"not_assigned",
					"partially_assigned",
					"assigned",
					"in_production",
					"awaiting_review",
				],
			},
		});
	});
});
