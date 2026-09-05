import { describe, expect, it } from "bun:test";
import { resolveSalesPipelineSnapshot, SALES_PIPELINE_CONTRACT_VERSION, salesOrderListProjectionVersion } from "@gnd/sales";
import {
	buildShadowLatencyEvidence,
	classifyProjectionFreshnessObservations,
	classifyShadowMembershipDifferences,
	collectSalesPipelineShadowReport,
	countShadowMembershipReasons,
	percentile95,
	withShadowDatabaseReadRetry,
} from "./sales-pipeline-shadow-report";

describe("Sales Pipeline shadow report", () => {
	it("refuses an empty audit instead of reporting zero differences and latency", async () => {
		await expect(collectSalesPipelineShadowReport({
			readProjections: async () => [],
			readSnapshots: async () => new Map(),
		})).rejects.toThrow("No eligible projections");
	});

	it("blocks unresolved revision drift even while the source keeps changing", async () => {
		let reads = 0;
		const report = await collectSalesPipelineShadowReport({
			readProjections: async () => [{ salesOrderId: 1, orderId: "SO-1", pipelineRevision: "old", payload: {} }],
			readSnapshots: async () => new Map([[1, { ...shadowSnapshot(), revision: `revision-${++reads}` }]]),
		});
		expect(report.concurrentFreshnessDifferences).toBe(1);
		expect(report.staleProjectionDifferences).toBe(1);
	});

	it.each([true, false])("retains missing canonical evidence in the blocking audit (missing initially: %s)", async (missingInitially) => {
		let reads = 0;
		const report = await collectSalesPipelineShadowReport({
			readProjections: async () => [{salesOrderId: 1, orderId: "SO-1", pipelineRevision: "old", payload: {}}],
			readSnapshots: async () => {
				reads += 1;
				return !missingInitially && reads === 1 ? new Map([[1, shadowSnapshot()]]) : new Map();
			},
		});
		expect(report.comparedOrders).toBe(1);
		expect(report.staleProjectionDifferences).toBe(1);
		expect(report.samples[0]?.differenceCodes).toContain("CANONICAL_EVIDENCE_MISSING");
	});

	it.each(["state", "version", "pipelineContractVersion"] as const)(
		"blocks a projection that loses %s eligibility during revalidation",
		async (field) => {
			const snapshot = shadowSnapshot();
			let reads = 0;
			const report = await collectSalesPipelineShadowReport({
				readProjections: async (query) => {
					reads += 1;
					const row = {
						salesOrderId: 1, orderId: "SO-1",
						pipelineRevision: reads === 1 ? "old" : snapshot.revision,
						payload: {}, state: "ready",
						version: salesOrderListProjectionVersion(),
						pipelineContractVersion: SALES_PIPELINE_CONTRACT_VERSION,
					};
					const actualEligibility = reads > 1 ? "ineligible" : row[field];
					return query.where?.[field] && query.where[field] !== actualEligibility ? [] : [row];
				},
				readSnapshots: async () => new Map([[1, snapshot]]),
			});
			expect(report.comparedOrders).toBe(1);
			expect(report.staleProjectionDifferences).toBe(1);
		},
	);

	it("calculates p95 from measured database/resolver batch durations", () => {
		expect(percentile95([])).toBe(0);
		expect(percentile95([1, 3, 2, 100, 4, 5, 6, 7, 8, 9, 10])).toBe(100);
		expect(
			percentile95(Array.from({ length: 100 }, (_, index) => index + 1)),
		).toBe(95);
	});

	it("gates on served projection reads while retaining resolver audit latency", () => {
		expect(
			buildShadowLatencyEvidence({
				projectionPageLatencies: [80, 100, 120],
				resolverAuditLatencies: [4_000, 5_000, 6_000],
			}),
		).toEqual({
			p95LatencyMs: 120,
			latencyMeasurement: {
				kind: "materialized-projection-page-read",
				sampleCount: 3,
				pageSize: 20,
			},
			auditResolverP95LatencyMs: 6_000,
			auditResolverLatencyMeasurement: {
				kind: "fresh-canonical-resolver-batch",
				sampleCount: 3,
				resolverBatchSize: 100,
			},
		});
	});

	it("requires a repeated mismatch before treating live-scan revision drift as persistent", () => {
		expect(
			classifyProjectionFreshnessObservations([
				{ projectionRevision: "old", snapshotRevision: "new" },
				{ projectionRevision: "new", snapshotRevision: "new" },
			]),
		).toBe("fresh");
		expect(
			classifyProjectionFreshnessObservations([
				{ projectionRevision: "old", snapshotRevision: "new-1" },
				{ projectionRevision: "new-1", snapshotRevision: "new-2" },
				{ projectionRevision: "new-2", snapshotRevision: "new-3" },
			]),
		).toBe("concurrent_change");
		expect(
			classifyProjectionFreshnessObservations([
				{ projectionRevision: "old", snapshotRevision: "new" },
				{ projectionRevision: "old", snapshotRevision: "new" },
			]),
		).toBe("persistent_stale");
	});

	it("retries transient production reads and resets the connection", async () => {
		let attempts = 0;
		let resets = 0;
		const result = await withShadowDatabaseReadRetry(
			async () => {
				attempts += 1;
				if (attempts < 3) {
					throw Object.assign(new Error("Can't reach database server"), {
						code: "P1001",
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

	it("does not retry non-connection failures", async () => {
		let attempts = 0;
		await expect(
			withShadowDatabaseReadRetry(
				async () => {
					attempts += 1;
					throw new Error("invalid query");
				},
				{ attempts: 3, delayMs: 0 },
			),
		).rejects.toThrow("invalid query");
		expect(attempts).toBe(1);
	});

	it("summarizes every review reason for representative conflict sampling", () => {
		expect(
			countShadowMembershipReasons([
				{
					membershipClassification: "review_required",
					membershipReasons: [
						"PRODUCTION_APPLICABILITY_UNKNOWN",
						"FULFILLMENT_APPLICABILITY_CONFLICT",
					],
				},
				{
					membershipClassification: "explained",
					membershipReasons: ["PRODUCTION_EXPLICITLY_NOT_REQUIRED"],
				},
				{
					membershipClassification: "review_required",
					membershipReasons: ["PRODUCTION_APPLICABILITY_UNKNOWN"],
				},
			]),
		).toEqual({
			FULFILLMENT_APPLICABILITY_CONFLICT: 1,
			PRODUCTION_APPLICABILITY_UNKNOWN: 2,
		});
	});
});

function shadowSnapshot() {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 1, orderNo: "SO-1", commercial: { status: "open" },
		payment: { total: 100, amountDue: 100 },
		material: { applicability: "not_required", requiredQty: 0, readyQty: 0 },
		production: { configuredRequirement: false, requiredQty: 0, assignments: [], submissions: [], aggregate: null, administrativeCompletion: null },
		fulfillment: { configuredRequirement: false, requiredQty: 0, packedQty: 0, dispatches: [], administrativeCompletion: null },
	});
}

describe("Sales Pipeline shadow membership classification", () => {
	it("explains intentional non-required and terminal semantic differences", () => {
		const snapshot = resolveSalesPipelineSnapshot({
			salesOrderId: 1,
			orderNo: "SO-1",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: false,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: true,
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 4,
						active: true,
						itemCount: 1,
						deliveredQty: 1,
						status: "completed",
						proofCompleted: true,
						inventoryCommitted: true,
					},
				],
				administrativeCompletion: null,
			},
		});

		expect(
			classifyShadowMembershipDifferences(snapshot, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
				{
					code: "FULFILLMENT_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
			]),
		).toEqual({
			classification: "explained",
			reasons: [
				"FULFILLMENT_OPERATIONALLY_COMPLETED",
				"PRODUCTION_EXPLICITLY_NOT_REQUIRED",
			],
		});
	});

	it("classifies unknown applicability as explicit operator review", () => {
		const unknown = resolveSalesPipelineSnapshot({
			salesOrderId: 2,
			orderNo: "SO-2",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 100 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: null,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(unknown, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
			]),
		).toEqual({
			classification: "review_required",
			reasons: ["PRODUCTION_APPLICABILITY_UNKNOWN"],
		});
	});

	it("explains a current required stage only from concrete current evidence", () => {
		const required = resolveSalesPipelineSnapshot({
			salesOrderId: 3,
			orderNo: "SO-3",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 100 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: true,
				requiredQty: 2,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(required, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: false,
					canonical: true,
				},
			]),
		).toEqual({
			classification: "explained",
			reasons: [
				"PRODUCTION_CURRENT_REQUIRED_QUANTITY",
				"PRODUCTION_EXPLICIT_CURRENT_REQUIREMENT",
			],
		});
	});

	it("leaves an inconsistent membership direction unexplained", () => {
		const completed = resolveSalesPipelineSnapshot({
			salesOrderId: 4,
			orderNo: "SO-4",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: false,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: true,
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 8,
						active: true,
						itemCount: 1,
						deliveredQty: 1,
						status: "completed",
						proofCompleted: true,
						inventoryCommitted: true,
					},
				],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(completed, [
				{
					code: "FULFILLMENT_MEMBERSHIP_MISMATCH",
					legacy: false,
					canonical: true,
				},
			]),
		).toEqual({
			classification: "unexplained",
			reasons: ["FULFILLMENT_UNEXPLAINED_MEMBERSHIP_DIRECTION"],
		});
	});
});
